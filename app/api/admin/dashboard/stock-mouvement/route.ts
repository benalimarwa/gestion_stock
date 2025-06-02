import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

interface StockData {
  [month: string]: {
    [product: string]: number;
  };
}

interface StockMovement {
  month: string;
  [product: string]: number | string; // string for month, number for quantities
}

export async function GET(request: Request) {
  let timeRange: string | null = "12m";

  try {
    const { searchParams } = new URL(request.url);
    timeRange = searchParams.get("timeRange") || "12m";

    // Set endDate to the current date (June 2, 2025)
    const endDate = new Date();
    endDate.setDate(1); // Start of the current month: June 1, 2025
    let startDate = new Date(endDate);
    let monthsToSubtract = 12;
    if (timeRange === "6m") monthsToSubtract = 6;
    else if (timeRange === "3m") monthsToSubtract = 3;
    startDate.setMonth(startDate.getMonth() - monthsToSubtract + 1);
    startDate.setDate(1);

    console.log(`API: Time range ${timeRange}, from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Query delivered commandes within the selected time range
    console.log(`API: Querying commandes for time range ${timeRange}`);
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

    console.log(`API: Found ${commandes.length} delivered commandes`);

    // Generate months list
    const months: string[] = [];
    let currentDate = new Date(startDate);
    const monthCount = timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : 12;
    for (let i = 0; i < monthCount; i++) {
      months.push(
        currentDate.toLocaleString("en-US", {
          month: "short",
          year: "numeric",
        })
      );
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Get unique products from commandes
    const products = Array.from(
      new Set(
        commandes.flatMap((c) => c.produits.map((p) => p.produit.nom))
      )
    );

    console.log(`API: Found ${products.length} unique products: ${products.join(", ")}`);

    // Initialize stock data
    const stockData: StockData = {};
    months.forEach((month) => {
      stockData[month] = {};
      products.forEach((product) => {
        stockData[month][product] = 0;
      });
    });

    // Aggregate quantities from commandes
    commandes.forEach((commande) => {
      if (commande.dateLivraison) {
        const month = new Date(commande.dateLivraison).toLocaleString("en-US", {
          month: "short",
          year: "numeric",
        });
        if (stockData[month]) {
          commande.produits.forEach((cp) => {
            stockData[month][cp.produit.nom] += cp.quantite;
          });
        } else {
          console.log(`API Warning: Commande month ${month} not in stockData for commande ${commande.id}`);
        }
      }
    });

    // Prepare response data
    const responseData: StockMovement[] = months.map((month) => ({
      month,
      ...stockData[month],
    }));

    console.log("API: Response data:", JSON.stringify(responseData, null, 2));

    // Check if data is empty or all quantities are 0
    if (
      responseData.length === 0 ||
      responseData.every((item) =>
        Object.keys(item).every(
          (key) => key === "month" || (typeof item[key] === "number" && item[key] === 0)
        )
      )
    ) {
      console.warn(`API: No meaningful product quantities for timeRange ${timeRange}. Response:`, responseData);
    }

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`API Error: Failed to process stock movement for timeRange ${timeRange}:`, error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des données",
        details: errMsg,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect().catch((err) => {
      console.error(`API Error: Failed to disconnect Prisma client:`, err);
    });
  }
}