import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

interface StockData {
  [month: string]: {
    [product: string]: number;
  };
}

export async function GET(request: Request) {
  let timeRange: string | null = "12m";

  try {
    const { searchParams } = new URL(request.url);
    timeRange = searchParams.get("timeRange") || "12m";

    // Set endDate to the current date (April 15, 2025)
    const endDate = new Date(); // Today: April 15, 2025
    endDate.setDate(1); // Start of the current month: April 1, 2025
    let startDate = new Date(endDate);
    let monthsToSubtract = 12;
    if (timeRange === "6m") monthsToSubtract = 6;
    else if (timeRange === "3m") monthsToSubtract = 3;
    startDate.setMonth(startDate.getMonth() - monthsToSubtract + 1); // +1 to include the current month
    startDate.setDate(1); // Start of the starting month

    // Step 1: Calculate initial stock levels (before startDate)
    console.log(`API: Querying all commandes before ${startDate} to calculate initial stock`);
    const priorCommandes = await prisma.commande.findMany({
      where: {
        statut: "LIVREE",
        date: {
          lt: startDate, // Before the start date
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

    console.log(`API: Found ${priorCommandes.length} delivered commandes before ${startDate}`);

    console.log(`API: Querying all demandes before ${startDate} to calculate initial stock`);
    const priorDemandes = await prisma.demande.findMany({
      where: {
        statut: "APPROUVEE",
        dateApprouvee: {
          lt: startDate,
          not: null,
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

    console.log(`API: Found ${priorDemandes.length} approved demandes before ${startDate}`);

    // Calculate initial stock for each product
    const initialStock: { [product: string]: number } = {};
    const allProducts = Array.from(
      new Set([
        ...priorCommandes.flatMap((c) => c.produits.map((p) => p.produit.nom)),
        ...priorDemandes.flatMap((d) => d.produits.map((p) => p.produit.nom)),
      ])
    );

    allProducts.forEach((product) => {
      initialStock[product] = 0;
    });

    priorCommandes.forEach((commande) => {
      commande.produits.forEach((cp) => {
        initialStock[cp.produit.nom] = (initialStock[cp.produit.nom] || 0) + cp.quantite;
      });
    });

    priorDemandes.forEach((demande) => {
      if (demande.dateApprouvee) {
        demande.produits.forEach((dp) => {
          initialStock[dp.produit.nom] = (initialStock[dp.produit.nom] || 0) - dp.quantite;
        });
      }
    });

    // Ensure initial stock doesn't go below 0
    Object.keys(initialStock).forEach((product) => {
      if (initialStock[product] < 0) initialStock[product] = 0;
    });

    console.log(`API: Initial stock levels as of ${startDate}:`, initialStock);

    // Step 2: Query commandes and demandes within the selected time range
    console.log(`API: Querying commandes for time range ${timeRange} (from ${startDate} to ${endDate})`);
    const commandes = await prisma.commande.findMany({
      where: {
        statut: "LIVREE",
        date: {
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

    console.log(`API: Querying demandes for time range ${timeRange} (from ${startDate} to ${endDate})`);
    const demandes = await prisma.demande.findMany({
      where: {
        statut: "APPROUVEE",
        dateApprouvee: {
          gte: startDate,
          lte: endDate,
          not: null,
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

    console.log(`API: Found ${demandes.length} approved demandes`);

    // Generate months list (exactly 3, 6, or 12 months)
    const months: string[] = [];
    let currentDate = new Date(startDate);
    const monthCount = timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : 12;
    for (let i = 0; i < monthCount; i++) {
      months.push(
        currentDate.toLocaleString("default", {
          month: "short",
          year: "numeric",
        })
      );
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Combine products from prior data and current time range
    const products = Array.from(
      new Set([
        ...allProducts,
        ...commandes.flatMap((c) => c.produits.map((p) => p.produit.nom)),
        ...demandes.flatMap((d) => d.produits.map((p) => p.produit.nom)),
      ])
    );

    console.log(`API: Found ${products.length} unique products: ${products.join(", ")}`);

    // Initialize stock data for the selected time range
    const stockData: StockData = {};
    months.forEach((month) => {
      stockData[month] = {};
      products.forEach((product) => {
        stockData[month][product] = 0;
      });
    });

    commandes.forEach((commande) => {
      const month = new Date(commande.date).toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      if (stockData[month]) {
        commande.produits.forEach((cp) => {
          stockData[month][cp.produit.nom] += cp.quantite;
        });
      } else {
        console.warn(`API Warning: Commande month ${month} not in stockData for commande ${commande.id}`);
      }
    });

    demandes.forEach((demande) => {
      if (demande.dateApprouvee) {
        const month = new Date(demande.dateApprouvee).toLocaleString("default", {
          month: "short",
          year: "numeric",
        });
        if (stockData[month]) {
          demande.produits.forEach((dp) => {
            stockData[month][dp.produit.nom] -= dp.quantite;
          });
        } else {
          console.warn(`API Warning: Demande month ${month} not in stockData for demande ${demande.id}`);
        }
      } else {
        console.warn(`API Warning: Null dateApprouvee for approved demande ${demande.id}`);
      }
    });

    // Calculate cumulative stock, starting from initial stock
    const cumulativeData: StockData = {};
    months.forEach((month, index) => {
      cumulativeData[month] = {};
      products.forEach((product) => {
        // If it's the first month, start with the initial stock
        const previousValue = index > 0 ? cumulativeData[months[index - 1]][product] || 0 : (initialStock[product] || 0);
        const currentChange = stockData[month][product] || 0;
        cumulativeData[month][product] = previousValue + currentChange;
        if (cumulativeData[month][product] < 0) {
          cumulativeData[month][product] = 0;
        }
      });
    });

    const responseData = months.map((month) => ({
      month,
      ...cumulativeData[month],
    }));

    console.log("API: Cumulative stock data:", cumulativeData);
    console.log("API: Response data:", responseData);

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