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

    // Remplacez la section de gestion des fichiers par cette version améliorée

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
    // Define storage directory avec vérifications supplémentaires
    const publicDir = path.join(process.cwd(), "public");
    const storageDir = path.join(publicDir, "factures");
    
    console.log("Storage directories:", {
      publicDir,
      storageDir,
      cwd: process.cwd(),
      publicExists: await access(publicDir).then(() => true).catch(() => false),
      storageExists: await access(storageDir).then(() => true).catch(() => false)
    });

    // Ensure directories exist with detailed logging
    try {
      await ensureDirectoryExists(publicDir);
      console.log("✓ Public directory verified");
    } catch (error) {
      console.error("✗ Failed to create/access public directory:", error);
      throw new Error(`Cannot access public directory: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await ensureDirectoryExists(storageDir);
      console.log("✓ Storage directory verified");
    } catch (error) {
      console.error("✗ Failed to create/access storage directory:", error);
      throw new Error(`Cannot access storage directory: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Generate unique filename avec timestamp pour éviter les collisions
    const timestamp = Date.now();
    const fileName = `facture-${commande.id}-${timestamp}-${uuidv4()}.pdf`;
    const facturePath = `/factures/${fileName}`; // Chemin public pour la base de données
    const fullFilePath = path.join(storageDir, fileName); // Chemin complet pour l'écriture

    console.log("File paths:", {
      fileName,
      facturePath,
      fullFilePath,
      storageDir
    });

    // Convert file to buffer avec vérifications
    let buffer: Buffer;
    try {
      const arrayBuffer = await factureFile.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      console.log("✓ Buffer created successfully, size:", buffer.length);
    } catch (error) {
      console.error("✗ Failed to create buffer:", error);
      throw new Error(`Erreur lors de la conversion du fichier: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Vérifier que le buffer n'est pas vide
    if (buffer.length === 0) {
      throw new Error("Le buffer du fichier est vide après conversion");
    }

    // Save file avec gestion d'erreur détaillée
    try {
      await writeFile(fullFilePath, buffer);
      console.log("✓ File written successfully to:", fullFilePath);
    } catch (writeError) {
      console.error("✗ Write file error:", writeError);
      // Vérifier l'espace disque et les permissions
      throw new Error(`Impossible d'écrire le fichier: ${writeError instanceof Error ? writeError.message : String(writeError)}`);
    }

    // Verify file was written
    try {
      await access(fullFilePath);
      console.log("✓ File verification successful");
      
      // Vérifier aussi la taille du fichier écrit
      const fs = await import('fs/promises');
      const stats = await fs.stat(fullFilePath);
      console.log("File stats:", {
        size: stats.size,
        originalSize: buffer.length,
        match: stats.size === buffer.length
      });
      
      if (stats.size !== buffer.length) {
        throw new Error(`Taille du fichier incorrecte: écrit ${stats.size}, attendu ${buffer.length}`);
      }
      
    } catch (verifyError) {
      console.error("✗ File verification failed:", verifyError);
      throw new Error(`Fichier sauvegardé mais non accessible: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
    }

    updateData.facture = facturePath;
    console.log("✓ File upload completed successfully");

  } catch (fileError) {
    console.error("Erreur détaillée lors de l'enregistrement du fichier:", {
      error: fileError,
      message: fileError instanceof Error ? fileError.message : String(fileError),
      stack: fileError instanceof Error ? fileError.stack : undefined,
      name: fileError instanceof Error ? fileError.name : 'Unknown',
      code: (fileError as any)?.code,
      errno: (fileError as any)?.errno,
      syscall: (fileError as any)?.syscall,
      path: (fileError as any)?.path
    });
    
    return NextResponse.json(
      {
        error: "Erreur lors de l'enregistrement de la facture",
        details: fileError instanceof Error ? fileError.message : String(fileError),
        debug: {
          phase: "file_upload",
          timestamp: new Date().toISOString(),
          fileInfo: {
            name: factureFile.name,
            size: factureFile.size,
            type: factureFile.type
          }
        }
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