import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { writeFile, mkdir, access } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { StatutProduit, StatutCommande } from "@prisma/client";

async function ensureDirectoryExists(dir: string) {
  try {
    // Vérifier si le répertoire existe déjà
    await access(dir);
    console.log(`Directory ${dir} already exists`);
  } catch {
    // Le répertoire n'existe pas, le créer
    try {
      await mkdir(dir, { recursive: true });
      console.log(`Directory ${dir} created successfully`);
    } catch (error) {
      console.error(`Failed to create directory ${dir}:`, error);
      throw new Error(`Unable to create directory ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse FormData
    const formData = await request.formData();
    const statutInput = formData.get("statut") as string;
    const raisonRetour = formData.get("raisonRetour") as string | null;

    console.log("Form data received:", {
      statut: statutInput,
      raisonRetour: raisonRetour,
      hasFacture: formData.has("facture")
    });

    // Validate statut against StatutCommande enum
    const validStatuts: StatutCommande[] = [
      StatutCommande.LIVREE,
      StatutCommande.EN_RETOUR,
      StatutCommande.ANNULEE,
    ];

    if (!statutInput || !Object.values(StatutCommande).includes(statutInput as StatutCommande)) {
      return NextResponse.json(
        { error: "Statut de commande non valide" },
        { status: 400 }
      );
    }

    const statut = statutInput as StatutCommande;
    if (!validStatuts.includes(statut)) {
      return NextResponse.json(
        { error: "Statut de commande non autorisé pour cette mise à jour" },
        { status: 400 }
      );
    }

    // Fetch the command
    const commande = await prisma.commande.findUnique({
      where: { id },
      include: {
        produits: {
          include: {
            produit: true,
          },
        },
      },
    });

    if (!commande) {
      return NextResponse.json(
        { error: "Commande non trouvée" },
        { status: 404 }
      );
    }

    // Prepare update data with explicit type
    const updateData: {
      statut: StatutCommande;
      facture?: string;
      dateLivraison?: Date;
      raisonRetour?: string | null;
    } = { statut };

    // Handle facture file upload
    const factureFile = formData.get("facture") as File | null;

    if (factureFile && statut === StatutCommande.LIVREE) {
      console.log("Processing facture file:", {
        name: factureFile.name,
        size: factureFile.size,
        type: factureFile.type,
      });

      // Validate file
      if (factureFile.size === 0) {
        return NextResponse.json(
          { error: "Le fichier facture est vide" },
          { status: 400 }
        );
      }

      // Validation plus flexible pour les types de fichiers PDF
      const validPdfTypes = [
        "application/pdf",
        "application/x-pdf",
        "application/acrobat",
        "applications/vnd.pdf",
        "text/pdf",
        "text/x-pdf"
      ];

      if (!validPdfTypes.includes(factureFile.type) && !factureFile.name.toLowerCase().endsWith('.pdf')) {
        return NextResponse.json(
          { error: `Le fichier doit être un PDF. Type reçu: ${factureFile.type}` },
          { status: 400 }
        );
      }

      // Limite de taille (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (factureFile.size > maxSize) {
        return NextResponse.json(
          { error: "Le fichier est trop volumineux (max 10MB)" },
          { status: 400 }
        );
      }

      try {
        // Define storage directory - utiliser un chemin absolu
        const publicDir = path.join(process.cwd(), "public");
        const storageDir = path.join(publicDir, "factures");
        
        console.log("Storage directories:", {
          publicDir,
          storageDir,
          cwd: process.cwd()
        });

        // Ensure directories exist
        await ensureDirectoryExists(publicDir);
        await ensureDirectoryExists(storageDir);

        // Generate unique filename avec timestamp pour éviter les collisions
        const timestamp = Date.now();
        const fileName = `facture-${commande.id}-${timestamp}-${uuidv4()}.pdf`;
        const facturePath = `/factures/${fileName}`; // Chemin public pour la base de données
        const fullFilePath = path.join(storageDir, fileName); // Chemin complet pour l'écriture

        console.log("File paths:", {
          fileName,
          facturePath,
          fullFilePath
        });

        // Convert file to buffer
        const arrayBuffer = await factureFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log("Buffer created, size:", buffer.length);

        // Save file
        await writeFile(fullFilePath, buffer);
        console.log("Facture file saved successfully to:", fullFilePath);

        // Verify file was written
        try {
          await access(fullFilePath);
          console.log("File verification successful");
        } catch (verifyError) {
          console.error("File verification failed:", verifyError);
          throw new Error("Fichier sauvegardé mais non accessible");
        }

        updateData.facture = facturePath;

      } catch (fileError) {
        console.error("Erreur détaillée lors de l'enregistrement du fichier:", {
          error: fileError,
          message: fileError instanceof Error ? fileError.message : String(fileError),
          stack: fileError instanceof Error ? fileError.stack : undefined
        });
        
        return NextResponse.json(
          {
            error: "Erreur lors de l'enregistrement de la facture",
            details: fileError instanceof Error ? fileError.message : String(fileError),
          },
          { status: 500 }
        );
      }
    }

    // Handle delivery (LIVREE)
    if (statut === StatutCommande.LIVREE) {
      updateData.dateLivraison = new Date();

      // Traitement des produits dans une transaction pour éviter les problèmes de concurrence
      await prisma.$transaction(async (tx) => {
        for (const item of commande.produits) {
          const produit = await tx.produit.findUnique({
            where: { id: item.produitId },
          });

          if (produit) {
            const nouvelleQuantite = produit.quantite + item.quantite;
            let nouveauStatut: StatutProduit;
            
            if (nouvelleQuantite === 0) {
              nouveauStatut = StatutProduit.RUPTURE;
            } else if (nouvelleQuantite <= produit.quantiteMinimale) {
              nouveauStatut = StatutProduit.CRITIQUE;
            } else {
              nouveauStatut = StatutProduit.NORMALE;
            }

            await tx.produit.update({
              where: { id: item.produitId },
              data: {
                quantite: nouvelleQuantite,
                statut: nouveauStatut,
              },
            });
          }
        }
      });
    }

    // Handle return (EN_RETOUR)
    if (statut === StatutCommande.EN_RETOUR) {
      if (raisonRetour) {
        updateData.raisonRetour = raisonRetour;
        console.log("Raison du retour:", raisonRetour);
      } else {
        return NextResponse.json(
          { error: "La raison du retour est requise" },
          { status: 400 }
        );
      }
    }

    // Log update data
    console.log("Update data:", JSON.stringify(updateData, null, 2));

    // Update the commande
    const updatedOrder = await prisma.commande.update({
      where: { id },
      data: updateData,
      include: {
        fournisseur: true,
        produits: {
          include: {
            produit: true,
          },
        },
      },
    });

    console.log("Commande updated successfully:", updatedOrder.id);

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: "Commande mise à jour avec succès"
    });

  } catch (error) {
    console.error("Erreur générale lors de la mise à jour:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      {
        error: "Erreur lors de la mise à jour du statut de commande",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}