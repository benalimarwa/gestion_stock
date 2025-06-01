import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const demandes = await prisma.demande.findMany({
      where: { statut: "APPROUVEE" }, // Filtrer les demandes acceptées
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
    const demandesParProduit = demandes.reduce((acc, demande) => {
      demande.produits.forEach((dp) => {
        const produitNom = dp.produit.nom;
        acc[produitNom] = (acc[produitNom] || 0) + dp.quantite; // Compter les quantités acceptées
      });
      return acc;
    }, {} as Record<string, number>);

    // Transformer en format pour Recharts
    const chartData = Object.entries(demandesParProduit).map(([produit, count]) => ({
      produit,
      demandesAcceptees: Number(count),
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Erreur lors de la récupération des demandes acceptées par produit :", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}