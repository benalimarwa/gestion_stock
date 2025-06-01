import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch all orders with their products and categories
    const commandes = await prisma.commande.findMany({
      include: {
        produits: {
          include: {
            produit: {
              select: {
                categorie: {
                  select: { nom: true },
                },
              },
            },
          },
        },
      },
    });

    // Aggregate orders by category and status
    const usageByCategory = commandes.reduce(
      (acc, commande) => {
        // Get unique categories for this order to avoid double-counting
        const categories = new Set(
          commande.produits.map((cp) => cp.produit.categorie.nom)
        );

        // Increment count for each category based on order status
        categories.forEach((category) => {
          if (!acc[category]) {
            acc[category] = {
              EN_ATTENTE: 0,
              LIVREE: 0,
              EN_RETOUR: 0,
              ANNULEE: 0,
            };
          }
          switch (commande.statut) {
            case "EN_COURS":
              acc[category].EN_ATTENTE += 1;
              break;
            case "LIVREE":
              acc[category].LIVREE += 1;
              break;
            case "EN_RETOUR":
              acc[category].EN_RETOUR += 1;
              break;
            case "ANNULEE":
              acc[category].ANNULEE += 1;
              break;
          }
        });
        return acc;
      },
      {} as Record<string, { EN_ATTENTE: number; LIVREE: number; EN_RETOUR: number; ANNULEE: number }>
    );

    // Transform into format for Recharts
    const chartData = Object.entries(usageByCategory).map(([category, stats]) => ({
      category,
      enAttente: stats.EN_ATTENTE,
      livree: stats.LIVREE,
      enRetour: stats.EN_RETOUR,
      annulee: stats.ANNULEE,
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Erreur dans GET /api/admin/dashboard/usage:", error);
    return NextResponse.json(
      {
        error: "Erreur serveur",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}