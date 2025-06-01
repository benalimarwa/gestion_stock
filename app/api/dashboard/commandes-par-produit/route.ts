import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const commandes = await prisma.commande.findMany({
      where: { statut: "LIVREE" }, // Filtrer les commandes livrées
      include: {
        produits: {
          include: {
            produit: {
              select: { nom: true },
            },
          },
        },
      },
    });

    // Regrouper par produit
    const commandesParProduit = commandes.reduce((acc, commande) => {
      commande.produits.forEach((cp) => {
        const produitNom = cp.produit.nom;
        acc[produitNom] = (acc[produitNom] || 0) + cp.quantite; // Compter les quantités livrées
      });
      return acc;
    }, {} as Record<string, number>);

    // Transformer en format pour Recharts
    const chartData = Object.entries(commandesParProduit).map(([produit, count]) => ({
      produit,
      commandesLivrees: Number(count),
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes livrées par produit :", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}