import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { StatutProduit, StatutCommande } from "@prisma/client";

async function ensureDirectoryExists(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
    console.log(`Directory ensured: ${dir}`);
  } catch (error) {
    console.error(`Failed to create directory ${dir}:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Unable to create directory ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let savedFilePath: string | undefined;
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

      const facturesDir = path.join(process.cwd(), "public", "factures");
      try {
        console.log("Ensuring directory exists:", facturesDir);
        await ensureDirectoryExists(facturesDir);

        const timestamp = Date.now();
        const fileName = `facture-${commande.id}-${timestamp}-${uuidv4()}.pdf`;
        savedFilePath = path.join(facturesDir, fileName);
        const facturePath = `/factures/${fileName}`;

        console.log("File paths:", { facturesDir, fileName, savedFilePath, facturePath });

        console.log("Converting file to buffer...");
        const arrayBuffer = await factureFile.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        if (fileBuffer.length === 0) {
          throw new Error("Buffer vide après conversion");
        }
        console.log("Buffer created, size:", fileBuffer.length);

        console.log("Writing file to:", savedFilePath);
        await writeFile(savedFilePath, fileBuffer);
        console.log("File written successfully");

        updateData.facture = facturePath;
      } catch (fileError) {
        console.error("Erreur détaillée lors du traitement du fichier:", {
          message: fileError instanceof Error ? fileError.message : String(fileError),
          stack: fileError instanceof Error ? fileError.stack : undefined,
          facturesDir,
          savedFilePath,
          factureName: factureFile.name,
          factureSize: factureFile.size,
          factureType: factureFile.type,
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

    // Update in transaction
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

      if (statut === StatutCommande.EN_RETOUR) {
        if (raisonRetour) {
          console.log("Raison du retour:", raisonRetour);
          // Note: raisonRetour is not in schema; logged for now
          // If schema is updated to include raisonRetour, uncomment:
          // updateData.raisonRetour = raisonRetour;
        } else {
          throw new Error("La raison du retour est requise");
        }
      }

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
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (savedFilePath) {
      try {
        await unlink(savedFilePath);
        console.log("Cleaned up file:", savedFilePath);
      } catch (unlinkError) {
        console.error("Failed to clean up file:", unlinkError);
      }
    }
    return NextResponse.json(
      {
        error: "Erreur lors de la mise à jour du statut de commande",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}