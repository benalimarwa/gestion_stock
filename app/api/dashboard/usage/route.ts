import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const commandes = await prisma.commande.findMany({
      include: {
        produits: {
          include: {
            produit: {
              select: {
                categorie: { select: { nom: true } },
              },
            },
          },
        },
      },
    });

    // Regrouper les commandes par catégorie et par statut
    const usageByCategory = commandes.reduce(
      (acc, commande) => {
        commande.produits.forEach((cp) => {
          const category = cp.produit.categorie.nom;
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
              acc[category].EN_ATTENTE += cp.quantite;
              break;
            case "LIVREE":
              acc[category].LIVREE += cp.quantite;
              break;
            case "EN_RETOUR":
              acc[category].EN_RETOUR += cp.quantite;
              break;
            case "ANNULEE":
              acc[category].ANNULEE += cp.quantite;
              break;
          }
        });
        return acc;
      },
      {} as Record<string, { EN_ATTENTE: number; LIVREE: number; EN_RETOUR: number; ANNULEE: number }>
    );

    // Transformer en format pour Recharts
    const chartData = Object.entries(usageByCategory).map(([category, stats]) => ({
      category,
      enAttente: stats.EN_ATTENTE,
      livree: stats.LIVREE,
      enRetour: stats.EN_RETOUR,
      annulee: stats.ANNULEE,
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Erreur dans GET /api/dashboard/usage:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}