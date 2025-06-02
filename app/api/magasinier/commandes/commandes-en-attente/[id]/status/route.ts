import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { StatutProduit, StatutCommande } from "@prisma/client";

async function ensureDirectoryExists(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
    console.log(`Directory ${dir} ensured`);
  } catch (error) {
    console.error(`Failed to create directory ${dir}:`, error);
    throw new Error(`Unable to create directory ${dir}`);
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

    // Validate statut against StatutCommande enum
    const validStatuts: StatutCommande[] = [
      StatutCommande.LIVREE,
      StatutCommande.EN_RETOUR,
      StatutCommande.ANNULEE,
    ];
    if (!Object.values(StatutCommande).includes(statutInput as StatutCommande)) {
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
      console.log("Facture file details:", {
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
      if (factureFile.type !== "application/pdf") {
        return NextResponse.json(
          { error: "Le fichier doit être un PDF" },
          { status: 400 }
        );
      }

      try {
        // Define storage directory
        const storageDir = path.join(process.cwd(), "public/factures");
        await ensureDirectoryExists(storageDir);

        // Generate unique filename
        const fileName = `facture-${commande.id}-${uuidv4()}.pdf`;
        const facturePath = path.join("/factures", fileName);

        // Save file
        const buffer = Buffer.from(await factureFile.arrayBuffer());
        const filePath = path.join(storageDir, fileName);
        await writeFile(filePath, buffer);
        console.log("Facture file saved to:", filePath);

        updateData.facture = facturePath;
      } catch (fileError) {
        console.error("Erreur lors de l'enregistrement du fichier:", fileError);
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

      for (const item of commande.produits) {
        const produit = await prisma.produit.findUnique({
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

          await prisma.produit.update({
            where: { id: item.produitId },
            data: {
              quantite: nouvelleQuantite,
              statut: nouveauStatut,
            },
          });
        }
      }
    }

    // Handle return (EN_RETOUR)
    if (statut === StatutCommande.EN_RETOUR && raisonRetour) {
      updateData.raisonRetour = raisonRetour;
      console.log("Raison du retour:", raisonRetour);
    }

    // Log update data
    console.log("Update data:", JSON.stringify(updateData, null, 2));

    // Update the commande
    const updatedOrder = await prisma.commande.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedOrder);

  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut de la commande:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la mise à jour du statut de commande",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}