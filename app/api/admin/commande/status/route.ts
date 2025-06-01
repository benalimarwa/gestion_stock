import { NextResponse } from "next/server";
import { PrismaClient, StatutCommande } from "@prisma/client";


const prisma = new PrismaClient();

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, statut, raisonRetour } = body;

    if (!id || !statut) {
      return NextResponse.json({ error: "ID et statut requis" }, { status: 400 });
    }

    if (statut === "EN_RETOUR" && !raisonRetour) {
      return NextResponse.json({ error: "Raison du retour requise pour le statut EN_RETOUR" }, { status: 400 });
    }

    const updateData: any = { statut: statut as StatutCommande };

    if (statut === "LIVREE") {
      updateData.dateLivraisonReelle = new Date();
    }

    if (statut === "EN_RETOUR") {
      updateData.raisonRetour = raisonRetour;
    }

    const commande = await prisma.commande.update({
      where: { id },
      data: updateData,
      include: {
        fournisseur: {
          select: {
            nom: true,
          },
        },
        produits: { include: { produit: true } },
      },
    });



    return NextResponse.json(commande);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}