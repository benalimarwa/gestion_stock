import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch approved demands with their products
    const demandes = await prisma.demande.findMany({
      where: {
        statut: "APPROUVEE",
      },
      include: {
        produits: {
          include: {
            produit: {
              select: {
                nom: true,
              },
            },
          },
        },
      },
    });

    // Count unique demands per product
    const demandesParProduit = demandes.reduce((acc, demande) => {
      // Use a Set to ensure each product is counted once per demand
      const produitsUniques = new Set(demande.produits.map((dp) => dp.produit.nom));
      produitsUniques.forEach((produitNom) => {
        acc[produitNom] = (acc[produitNom] || 0) + 1; // Increment by 1 for this demand
      });
      return acc;
    }, {} as Record<string, number>);

    // Transform into chart data format
    const chartData = Object.entries(demandesParProduit).map(([produit, count]) => ({
      produit,
      demandesAcceptees: Number(count),
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Erreur lors de la récupération des demandes acceptées par produit :", error);
    return NextResponse.json(
      {
        error: "Failed to fetch data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}