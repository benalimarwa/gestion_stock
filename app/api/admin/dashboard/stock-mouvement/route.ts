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

    console.log(`API: Fetching stock data for time range ${timeRange}`);

    // Générer la liste des mois selon la période sélectionnée
    const months: string[] = [];
    const currentDate = new Date();
    const monthCount = timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : 12;
    
    // Commencer par le mois actuel et remonter dans le temps
    const startDate = new Date(currentDate);
    startDate.setMonth(startDate.getMonth() - monthCount + 1);
    
    const tempDate = new Date(startDate);
    for (let i = 0; i < monthCount; i++) {
      months.push(
        tempDate.toLocaleString("fr-FR", {
          month: "short",
          year: "numeric",
        })
      );
      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    console.log(`API: Generated months: ${months.join(", ")}`);

    // Récupérer tous les produits avec leurs quantités actuelles
    const produits = await prisma.produit.findMany({
      select: {
        nom: true,
        quantite: true, // Supposant que vous avez un champ quantite dans votre modèle Produit
      },
    });

    console.log(`API: Found ${produits.length} products`);

    // Si vous n'avez pas de champ quantite, récupérer depuis les commandes
    if (produits.length === 0 || !produits[0].hasOwnProperty('quantite')) {
      // Alternative: calculer les quantités depuis les commandes
      const commandes = await prisma.commande.findMany({
        where: {
          statut: "LIVREE",
        },
        include: {
          produits: {
            include: {
              produit: true,
            },
          },
        },
      });

      // Agréger les quantités totales par produit
      const productQuantities: { [productName: string]: number } = {};
      
      commandes.forEach((commande) => {
        commande.produits.forEach((cp) => {
          const productName = cp.produit.nom;
          if (!productQuantities[productName]) {
            productQuantities[productName] = 0;
          }
          productQuantities[productName] += cp.quantite;
        });
      });

      // Convertir en format produits
      const calculatedProducts = Object.keys(productQuantities).map(nom => ({
        nom,
        quantite: productQuantities[nom]
      }));

      console.log(`API: Calculated quantities for ${calculatedProducts.length} products`);

      // Préparer les données de réponse avec les mêmes quantités pour chaque mois
      const responseData: StockMovement[] = months.map((month) => {
        const monthData: StockMovement = { month };
        
        calculatedProducts.forEach((produit) => {
          monthData[produit.nom] = produit.quantite;
        });
        
        return monthData;
      });

      console.log("API: Response data:", JSON.stringify(responseData, null, 2));
      return NextResponse.json(responseData, { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    // Si vous avez un champ quantite dans le modèle Produit
    const responseData: StockMovement[] = months.map((month) => {
      const monthData: StockMovement = { month };
      
      produits.forEach((produit) => {
        monthData[produit.nom] = produit.quantite || 0;
      });
      
      return monthData;
    });

    console.log("API: Response data:", JSON.stringify(responseData, null, 2));

    return NextResponse.json(responseData, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`API Error: Failed to process stock data for timeRange ${timeRange}:`, error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des données de stock",
        details: errMsg,
        timeRange: timeRange,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect().catch((err) => {
      console.error(`API Error: Failed to disconnect Prisma client:`, err);
    });
  }
}