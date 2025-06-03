// app/api/magasinier/commandes/commandes-en-attente/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { writeFile, mkdir, access } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { StatutProduit, StatutCommande } from "@prisma/client";

// Fonction pour s'assurer que le répertoire existe
async function ensureDirectoryExists(dir: string) {
  try {
    await access(dir);
    console.log(`Directory ${dir} already exists`);
  } catch {
    // Le dossier n'existe pas, il faut le créer
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

    // Utilisation de FormData au lieu de JSON pour supporter l'upload de fichiers
    const formData = await request.formData();
    const statutInput = formData.get("statut") as string;
    const raisonRetour = formData.get("raisonRetour") as string | null;
    
    console.log("Form data received:", {
      statut: statutInput,
      raisonRetour: raisonRetour,
      hasFacture: formData.has("facture")
    });

    // Validation du statut avec les types Prisma
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

    // Récupérer les informations de la commande avec les produits associés
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

    // Préparation des données à mettre à jour avec types explicites
    const updateData: {
      statut: StatutCommande;
      facture?: string;
      dateLivraison?: Date;
      raisonRetour?: string | null;
    } = { statut };

    // Traitement de la facture si disponible
    const factureFile = formData.get("facture") as File | null;
    
    if (factureFile && statut === StatutCommande.LIVREE) {
      console.log("Processing facture file:", {
        name: factureFile.name,
        size: factureFile.size,
        type: factureFile.type,
      });

      // Validation du fichier
      if (factureFile.size === 0) {
        return NextResponse.json(
          { error: "Le fichier facture est vide" },
          { status: 400 }
        );
      }

      // Validation du type de fichier PDF
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
      const maxSize = 10 * 1024 * 1024;
      if (factureFile.size > maxSize) {
        return NextResponse.json(
          { error: "Le fichier est trop volumineux (max 10MB)" },
          { status: 400 }
        );
      }

      try {
        // Créer le chemin du dossier de destination
        const publicDir = path.join(process.cwd(), "public");
        const uploadsDir = path.join(publicDir, "uploads");
        const facturesDir = path.join(uploadsDir, "factures");
        
        console.log("Directory paths:", {
          publicDir,
          uploadsDir,
          facturesDir
        });

        // S'assurer que tous les dossiers existent
        await ensureDirectoryExists(publicDir);
        await ensureDirectoryExists(uploadsDir);
        await ensureDirectoryExists(facturesDir);
        
        // Générer un nom de fichier unique
        const timestamp = Date.now();
        const fileName = `facture-${commande.id}-${timestamp}-${uuidv4()}.pdf`;
        const filePath = path.join(facturesDir, fileName);
        
        console.log("File paths:", {
          fileName,
          filePath
        });
        
        // Convertir le fichier en buffer
        const arrayBuffer = await factureFile.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        
        if (fileBuffer.length === 0) {
          throw new Error("Buffer vide après conversion");
        }
        
        console.log("Buffer created, size:", fileBuffer.length);
        
        // Écrire le fichier
        await writeFile(filePath, fileBuffer);
        console.log("File written successfully");
        
        // Vérifier que le fichier a été écrit
        try {
          await access(filePath);
          console.log("File verification successful");
        } catch (verifyError) {
          console.error("File verification failed:", verifyError);
          throw new Error("Fichier sauvegardé mais non accessible");
        }
        
        // Chemin relatif pour stocker dans la base de données
        const facturePath = `/uploads/factures/${fileName}`;
        updateData.facture = facturePath;
        
      } catch (fileError) {
        console.error("Erreur détaillée lors du traitement du fichier:", {
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

    // Si c'est une livraison, ajouter la date de livraison et mettre à jour les quantités
    if (statut === StatutCommande.LIVREE) {
      // Définir la date de livraison à la date actuelle
      updateData.dateLivraison = new Date();

      // Utiliser une transaction pour éviter les problèmes de concurrence
      await prisma.$transaction(async (tx) => {
        // Mettre à jour la quantité de chaque produit dans la commande
        for (const item of commande.produits) {
          // Récupérer d'abord le produit pour avoir sa quantité actuelle et minimale
          const produit = await tx.produit.findUnique({
            where: { id: item.produitId }
          });
              
          if (produit) {
            // Calculer la nouvelle quantité
            const nouvelleQuantite = produit.quantite + item.quantite;
                  
            // Déterminer le nouveau statut avec les bonnes valeurs d'enum
            let nouveauStatut: StatutProduit;
            if (nouvelleQuantite === 0) {
              nouveauStatut = StatutProduit.RUPTURE;
            } else if (nouvelleQuantite <= produit.quantiteMinimale) {
              nouveauStatut = StatutProduit.CRITIQUE;
            } else {
              nouveauStatut = StatutProduit.NORMALE;
            }
                  
            // Mettre à jour le produit
            await tx.produit.update({
              where: { id: item.produitId },
              data: {
                quantite: nouvelleQuantite,
                statut: nouveauStatut
              }
            });

            console.log(`Product ${item.produitId} updated: ${produit.quantite} + ${item.quantite} = ${nouvelleQuantite}, status: ${nouveauStatut}`);
          }
        }
      });
    }

    // Si c'est un retour, ajouter la raison du retour
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

    console.log("Update data:", JSON.stringify(updateData, null, 2));

    // Mettre à jour la commande
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

    console.log("Order updated successfully:", updatedOrder.id);

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