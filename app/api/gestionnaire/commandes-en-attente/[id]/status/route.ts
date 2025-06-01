import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } >}
) {
  try {
    const { id } =await  params;

    // Parse FormData
    const formData = await request.formData();
    const statut = formData.get("statut") as string | null;
    const raisonRetour = formData.get("raisonRetour") as string | null;
    const factureFile = formData.get("facture") as File | null;

    // Validate statut
    if (!statut) {
      console.error("Missing 'statut' in FormData");
      return NextResponse.json(
        { error: "Le champ 'statut' est requis" },
        { status: 400 }
      );
    }

    const validStatuts = ["LIVREE", "EN_RETOUR", "ANNULEE"];
    if (!validStatuts.includes(statut)) {
      console.error(`Invalid statut: ${statut}`);
      return NextResponse.json(
        { error: `Statut invalide. Valeurs autorisées : ${validStatuts.join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch the order with associated products
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
      console.error(`Order not found: ${id}`);
      return NextResponse.json(
        { error: "Commande non trouvée" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = { statut };

    // Handle specific status logic
    if (statut === "LIVREE") {
      // Set delivery date
      updateData.dateLivraison = new Date();

      // Process invoice file if provided
      if (factureFile && factureFile.size > 0) {
        try {
          const uploadsDir = path.join(process.cwd(), "public", "uploads", "factures");
          await mkdir(uploadsDir, { recursive: true });

          const fileName = `facture-${commande.id}-${uuidv4()}.pdf`;
          const filePath = path.join(uploadsDir, fileName);
          const fileBuffer = Buffer.from(await factureFile.arrayBuffer());

          await writeFile(filePath, fileBuffer);
          updateData.facture = `/Uploads/factures/${fileName}`;
          console.log(`Invoice saved: ${filePath}`);
        } catch (fileError) {
          console.error("Erreur lors du traitement du fichier:", fileError);
          // Continue without invoice if file processing fails
        }
      }

      // Update product quantities
      for (const item of commande.produits) {
        const produit = await prisma.produit.findUnique({
          where: { id: item.produitId },
        });

        if (produit) {
          const nouvelleQuantite = produit.quantite + item.quantite;
          let nouveauStatut: "RUPTURE" | "CRITIQUE" | "NORMALE";

          if (nouvelleQuantite === 0) {
            nouveauStatut = "RUPTURE";
          } else if (nouvelleQuantite <= produit.quantiteMinimale) {
            nouveauStatut = "CRITIQUE";
          } else {
            nouveauStatut = "NORMALE";
          }

          await prisma.produit.update({
            where: { id: item.produitId },
            data: {
              quantite: nouvelleQuantite,
              statut: nouveauStatut,
            },
          });
          console.log(`Updated product ${item.produitId}: quantity=${nouvelleQuantite}, status=${nouveauStatut}`);
        }
      }
    } else if (statut === "EN_RETOUR") {
      // Add return reason if provided
      if (raisonRetour) {
        updateData.raisonRetour = raisonRetour;
      } else {
        console.warn("No raisonRetour provided for EN_RETOUR status");
      }
    } else if (statut === "ANNULEE") {
      // No additional processing needed for cancellation
      console.log(`Canceling order: ${id}`);
    }

    // Update the order
    const updatedOrder = await prisma.commande.update({
      where: { id },
      data: updateData,
    });

    console.log(`Order updated: ${id}, new status: ${statut}`);
    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de la commande:`, error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du statut de la commande" },
      { status: 500 }
    );
  }
}