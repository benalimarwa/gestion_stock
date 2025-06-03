import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { StatutProduit, StatutCommande } from "@prisma/client";

async function ensureDirectoryExists(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
    console.log(`Directory ${dir} ensured or created`);
  } catch (error) {
    console.error(`Failed to create directory ${dir}:`, error);
    throw new Error(`Unable to create directory ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    const factureFile = formData.get("facture") as File | null;

    console.log("Form data received:", {
      statut: statutInput,
      raisonRetour,
      hasFacture: !!factureFile,
      factureName: factureFile?.name,
      factureSize: factureFile?.size,
      factureType: factureFile?.type,
    });

    // Validate statut
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

    // Prepare update data
    const updateData: {
      statut: StatutCommande;
      facture?: string;
      dateLivraison?: Date;
      raisonRetour?: string | null;
    } = { statut };

    // Handle facture file upload
    if (factureFile && statut === StatutCommande.LIVREE) {
      // Validate file
      if (factureFile.size === 0) {
        return NextResponse.json(
          { error: "Le fichier facture est vide" },
          { status: 400 }
        );
      }

      const validPdfTypes = [
        "application/pdf",
        "application/x-pdf",
        "application/acrobat",
        "applications/vnd.pdf",
        "text/pdf",
        "text/x-pdf",
      ];
      if (!validPdfTypes.includes(factureFile.type) && !factureFile.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: `Le fichier doit être un PDF. Type reçu: ${factureFile.type}` },
          { status: 400 }
        );
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (factureFile.size > maxSize) {
        return NextResponse.json(
          { error: "Le fichier est trop volumineux (max 10MB)" },
          { status: 400 }
        );
      }

      try {
        // Define storage directory
        const facturesDir = path.join(process.cwd(), "public", "Uploads", "factures");
        await ensureDirectoryExists(facturesDir);

        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `facture-${commande.id}-${timestamp}-${uuidv4()}.pdf`;
        const filePath = path.join(facturesDir, fileName);
        const facturePath = `/Uploads/factures/${fileName}`;

        console.log("File paths:", { facturesDir, fileName, filePath, facturePath });

        // Save file
        const arrayBuffer = await factureFile.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        if (fileBuffer.length === 0) {
          throw new Error("Buffer vide après conversion");
        }

        await writeFile(filePath, fileBuffer);
        console.log("File written successfully to:", filePath);

        updateData.facture = facturePath;
      } catch (fileError) {
        console.error("Erreur détaillée lors du traitement du fichier:", {
          error: fileError,
          message: fileError instanceof Error ? fileError.message : String(fileError),
          stack: fileError instanceof Error ? fileError.stack : undefined,
          facturesDir: path.join(process.cwd(), "public", "Uploads", "factures"),
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
    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (statut === StatutCommande.LIVREE) {
        updateData.dateLivraison = new Date();

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

            console.log(`Produit ${item.produitId} mis à jour: ${produit.quantite} + ${item.quantite} = ${nouvelleQuantite}, statut: ${nouveauStatut}`);
          }
        }
      }

      // Handle return (EN_RETOUR)
      if (statut === StatutCommande.EN_RETOUR) {
        if (!raisonRetour) {
          throw new Error("La raison du retour est requise");
        }
        updateData.raisonRetour = raisonRetour;
        console.log("Raison du retour:", raisonRetour);
      }

      // Update the commande
      return tx.commande.update({
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
    });

    console.log("Commande mise à jour avec succès:", updatedOrder.id);

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: "Commande mise à jour avec succès",
    });

  } catch (error) {
    console.error("Erreur générale lors de la mise à jour:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
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