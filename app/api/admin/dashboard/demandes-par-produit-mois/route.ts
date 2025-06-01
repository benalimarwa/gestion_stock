import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// Définir un type pour monthlyData
interface MonthlyData {
  [month: string]: {
    [product: string]: number;
  };
}

// Helper function to safely extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Une erreur inconnue s\'est produite';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "12m"; // Par défaut 12 mois

    // Calculer la date de début et de fin en fonction de timeRange
    const endDate = new Date();
    let startDate = new Date(endDate);
    let monthsToSubtract = 12; // Par défaut 12 mois
    if (timeRange === "6m") monthsToSubtract = 6;
    else if (timeRange === "3m") monthsToSubtract = 3;
    startDate.setMonth(startDate.getMonth() - monthsToSubtract);
    startDate.setDate(1); // Début du mois
    endDate.setDate(1); // Début du mois pour uniformité

    // Récupérer les demandes approuvées dans la période
    // Note: On filtre aussi par dateApprouvee NOT NULL pour éviter les valeurs null
    const demandes = await prisma.demande.findMany({
      where: {
        statut: "APPROUVEE",
        dateApprouvee: {
          not: null, // Exclure les valeurs null
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        produits: {
          include: {
            produit: true, // Inclure les détails du produit
          },
        },
      },
    });

    // Générer une liste de tous les mois dans la période
    const months: string[] = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const monthYear = currentDate.toLocaleString("default", {
        month: "short",
        year: "numeric",
      }); // Ex: "Mar 2025"
      months.push(monthYear);
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Récupérer tous les produits uniques
    const products = [
      ...new Set(
        demandes.flatMap((demande) =>
          demande.produits.map((dp) => dp.produit.nom)
        )
      ),
    ];

    // Agréger les données par mois et par produit
    const monthlyData: MonthlyData = {};
    months.forEach((month) => {
      monthlyData[month] = {};
      products.forEach((product) => {
        monthlyData[month][product] = 0; // Initialiser à 0 pour chaque produit
      });
    });

    // Remplir les données réelles
    demandes.forEach((demande) => {
      // Vérification de sécurité supplémentaire (bien que filtrée dans la requête)
      if (!demande.dateApprouvee) {
        console.warn(`Demande ${demande.id} has null dateApprouvee, skipping...`);
        return;
      }

      const date = new Date(demande.dateApprouvee);
      const monthYear = date.toLocaleString("default", {
        month: "short",
        year: "numeric",
      }); // Ex: "Mar 2025"

      demande.produits.forEach((demandeProduit) => {
        const produitNom = demandeProduit.produit.nom;
        monthlyData[monthYear][produitNom] =
          (monthlyData[monthYear][produitNom] || 0) + demandeProduit.quantite;
      });
    });

    // Rendre les quantités cumulatives
    const cumulativeData: MonthlyData = {};
    months.forEach((month, index) => {
      cumulativeData[month] = {};
      products.forEach((product) => {
        const previousValue = index > 0 ? cumulativeData[months[index - 1]][product] || 0 : 0;
        cumulativeData[month][product] = previousValue + monthlyData[month][product];
      });
    });

    // Convertir en tableau pour la réponse
    const responseData = months.map((month) => ({
      month,
      ...cumulativeData[month],
    }));

    return NextResponse.json(responseData, {
      status: 200,
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}