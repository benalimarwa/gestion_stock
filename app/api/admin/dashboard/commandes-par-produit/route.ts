import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Obtenir l'année courante
    const currentYear = new Date().getFullYear();
    
    // Définir les dates de début et de fin pour l'année courante
    const startDate = new Date(`${currentYear}-01-01`);
    const endDate = new Date(`${currentYear}-12-31`);
    
    const commandes = await prisma.commande.findMany({
      where: {
        statut: "LIVREE",
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
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
    
    // Regrouper par produit (compter les commandes uniques par produit)
    const commandesParProduit = commandes.reduce((acc, commande) => {
      // Utiliser un Set pour éviter de compter plusieurs fois le même produit dans une commande
      const produitsUniques = new Set(commande.produits.map((cp) => cp.produit.nom));
      produitsUniques.forEach((produitNom) => {
        acc[produitNom] = (acc[produitNom] || 0) + 1; // Incrémenter de 1 par commande
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
    return NextResponse.json(
      { error: "Failed to fetch commandes data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}