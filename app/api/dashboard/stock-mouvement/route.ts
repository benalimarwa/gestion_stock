import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

interface StockData {
  [month: string]: {
    [product: string]: number;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "12m";

    const endDate = new Date();
    let startDate = new Date(endDate);
    let monthsToSubtract = 12;
    if (timeRange === "6m") monthsToSubtract = 6;
    else if (timeRange === "3m") monthsToSubtract = 3;
    startDate.setMonth(startDate.getMonth() - monthsToSubtract);
    startDate.setDate(1);
    endDate.setDate(1);

    // Get stock movements from commands (entries) and demands (exits)
    const commandes = await prisma.commande.findMany({
      where: {
        statut: "LIVREE",
        dateLivraison: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        produits: {
          include: {
            produit: true,
          },
        },
      },
    });

    const demandes = await prisma.demande.findMany({
      where: {
        statut: "APPROUVEE",
        dateApprouvee: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        produits: {
          include: {
            produit: true,
          },
        },
      },
    });

    // Generate months list
    const months: string[] = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      months.push(
        currentDate.toLocaleString("default", {
          month: "short",
          year: "numeric",
        })
      );
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Get unique products
    const products = [
      ...new Set([
        ...commandes.flatMap((c) => c.produits.map((p) => p.produit.nom)),
        ...demandes.flatMap((d) => d.produits.map((p) => p.produit.nom)),
      ]),
    ];

    // Initialize stock data
    const stockData: StockData = {};
    months.forEach((month) => {
      stockData[month] = {};
      products.forEach((product) => {
        stockData[month][product] = 0;
      });
    });

    // Process entries (commandes)
    commandes.forEach((commande) => {
      const month = new Date(commande.dateLivraison!).toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      commande.produits.forEach((cp) => {
        stockData[month][cp.produit.nom] += cp.quantite;
      });
    });

    // Process exits (demandes)
    demandes.forEach((demande) => {
      const month = new Date(demande.dateApprouvee!).toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      demande.produits.forEach((dp) => {
        stockData[month][dp.produit.nom] -= dp.quantite;
      });
    });

    // Calculate cumulative stock
    const cumulativeData: StockData = {};
    months.forEach((month, index) => {
      cumulativeData[month] = {};
      products.forEach((product) => {
        const previousValue = index > 0 ? cumulativeData[months[index - 1]][product] || 0 : 0;
        cumulativeData[month][product] = previousValue + stockData[month][product];
      });
    });

    const responseData = months.map((month) => ({
      month,
      ...cumulativeData[month],
    }));

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}