import { NextResponse } from "next/server";
import { PrismaClient, StatutCommande } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const commandes = await prisma.commande.findMany({
      where: {
        statut: {
          in: ["LIVREE", "ANNULEE", "EN_RETOUR", "EN_COURS"] as StatutCommande[],
        },
      },
      include: {
        fournisseur: {
          select: {
            nom: true,
          },
        },
        produits: {
          include: {
            produit: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(commandes);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fournisseurId, produits, statut = "EN_COURS", dateLivraison } = body;

    if (!fournisseurId) {
      return NextResponse.json({ error: "Fournisseur requis" }, { status: 400 });
    }
    if (!produits || !Array.isArray(produits) || produits.length === 0) {
      return NextResponse.json({ error: "Produits requis" }, { status: 400 });
    }

    const produitIds = produits.map((p: any) => p.produitId);
    const fournisseur = await prisma.fournisseur.findFirst({
      where: {
        id: fournisseurId,
        produits: {
          some: {
            produitId: { in: produitIds },
          },
        },
      },
    });

    if (!fournisseur) {
      return NextResponse.json(
        { error: "Le fournisseur ne fournit pas tous les produits sélectionnés" },
        { status: 400 }
      );
    }

    const commande = await prisma.commande.create({
      data: {
        fournisseurId,
        statut: statut as StatutCommande,
        date: new Date(),
        datePrevu: dateLivraison ? new Date(dateLivraison) : new Date(),
        produits: {
          create: produits.map((p: any) => ({
            produitId: p.produitId,
            quantite: p.quantite,
          })),
        },
      },
      include: {
        fournisseur: {
          select: {
            nom: true,
          },
        },
        produits: { include: { produit: true } },
      },
    });

    return NextResponse.json(commande, { status: 201 });
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
