import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

interface StockMovement {
  month: string;
  [product: string]: number | string; // string for month, number for quantities
}

export async function GET(request: Request) {
  let timeRange: string | null = "12m";

  try {
    const { searchParams } = new URL(request.url);
    timeRange = searchParams.get("timeRange") || "12m";

    console.log(`API: Fetching stock movement data for time range ${timeRange}`);

    // Define the current year
    const currentYear = new Date().getFullYear();

    // Generate months from January to December for the current year
    const months: string[] = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(currentYear, i, 1);
      return date.toLocaleString("fr-FR", {
        month: "short",
        year: "numeric",
      });
    });

    console.log(`API: Generated months: ${months.join(", ")}`);

    // Determine the start date based on timeRange
    const monthCount = timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : 12;
    const startMonthIndex = Math.max(0, 12 - monthCount);
    const filteredMonths = months.slice(startMonthIndex);

    console.log(`API: Filtered months for timeRange ${timeRange}: ${filteredMonths.join(", ")}`);

    // Fetch delivered orders (Commande with LIVREE status) for the current year
    const commandes = await prisma.commande.findMany({
      where: {
        statut: "LIVREE",
        dateLivraison: {
          gte: new Date(currentYear, 0, 1), // Start of the year
          lte: new Date(currentYear, 11, 31, 23, 59, 59), // End of the year
        },
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

    console.log(`API: Found ${commandes.length} delivered orders`);

    // Aggregate quantities by product and month
    const stockData: { [month: string]: { [product: string]: number } } = {};
    filteredMonths.forEach((month) => {
      stockData[month] = {};
    });

    const allProducts = new Set<string>();
    commandes.forEach((commande) => {
      if (!commande.dateLivraison) return;
      const deliveryMonth = commande.dateLivraison.toLocaleString("fr-FR", {
        month: "short",
        year: "numeric",
      });

      if (!filteredMonths.includes(deliveryMonth)) return;

      commande.produits.forEach((cp) => {
        const productName = cp.produit.nom;
        allProducts.add(productName);

        if (!stockData[deliveryMonth][productName]) {
          stockData[deliveryMonth][productName] = 0;
        }
        stockData[deliveryMonth][productName] += cp.quantite;
      });
    });

    console.log(`API: Aggregated stock data for ${allProducts.size} products`);

    // Prepare response data
    const responseData: StockMovement[] = filteredMonths.map((month) => {
      const monthData: StockMovement = { month };
      allProducts.forEach((product) => {
        monthData[product] = stockData[month][product] || 0;
      });
      return monthData;
    });

    console.log("API: Response data:", JSON.stringify(responseData, null, 2));

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`API Error: Failed to process stock movement data for timeRange ${timeRange}:`, error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des données de mouvement de stock",
        details: errMsg,
        timeRange,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect().catch((err) => {
      console.error(`API Error: Failed to disconnect Prisma client:`, err);
    });
  }
}