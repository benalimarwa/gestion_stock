// app/api/magasinier/commandes/commandes-en-attente/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { StatutProduit } from "@prisma/client";

async function ensureDirectoryExists(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
    console.log(`Directory ensured: ${dir}`);
  } catch (error) {
    console.error(`Failed to create/access directory ${dir}:`, error);
    throw new Error(`Unable to create/access directory: ${dir}`);
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
    const statut = formData.get("statut") as string;
    const raisonRetour = formData.get("raisonRetour") as string | null;

    // Validate statut
    const validStatuts = ["LIVREE", "EN_RETOUR", "ANNULEE"];
    if (!validStatuts.includes(statut)) {
      return NextResponse.json(
        { error: "Statut de commande invalide" },
        { status: 400 }
      );
    }

    // Fetch the commande
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
    const updateData: any = { statut };

    // Handle facture file upload
    const factureFile = formData.get("facture") as File | null;
    let facturePath: string | undefined;

    if (factureFile && statut === "LIVREE") {
      // Log file details
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
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "factures");
        console.log("Target directory:", uploadsDir);

        // Ensure directory exists
        await ensureDirectoryExists(uploadsDir);

        // Generate unique filename
        const fileName = `facture-${commande.id}-${uuidv4()}.pdf`;
        const filePath = path.join(uploadsDir, fileName);
        console.log("Target file path:", filePath);

        // Convert file to buffer
        const fileBuffer = Buffer.from(await factureFile.arrayBuffer());
        console.log("File buffer size:", fileBuffer.length);

        // Write file
        await writeFile(filePath, fileBuffer);
        console.log("File written successfully:", filePath);

        // Set facture path
        facturePath = `/uploads/factures/${fileName}`;
        updateData.facture = facturePath;
      } catch (fileError) {
        console.error("Erreur lors du traitement du fichier:", fileError);
        return NextResponse.json(
          {
            error: "Erreur lors de l'enregistrement de la facture",
            details: fileError instanceof Error ? fileError.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    // Handle delivery (LIVREE)
    if (statut === "LIVREE") {
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
    if (statut === "EN_RETOUR" && raisonRetour) {
      console.log("Raison du retour:", raisonRetour);
    }

    // Log update data
    console.log("Update data:", updateData);

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
        error: "Erreur lors de la mise à jour du statut de la commande",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}