// app/api/demandeurUser/dashboard/chart/route.ts
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { Demande, DemandeExceptionnelle, DemandeProduit, Produit, ProduitExceptionnel, DemandeProduitExceptionnel } from "@prisma/client";

// Define more specific types based on includes
type DemandeWithProduits = Demande & {
  produits: (DemandeProduit & {
    produit: Produit;
  })[];
};

type DemandeExceptionnelleWithProduits = DemandeExceptionnelle & {
  produitsExceptionnels: (DemandeProduitExceptionnel & {
    produitExceptionnel: ProduitExceptionnel;
  })[];
};

export async function GET() {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Find the user in our database using Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
      include: {
        demandeur: true,
      },
    });
    
    if (!dbUser || !dbUser.demandeur) {
      return NextResponse.json({ error: "User not found or not a demandeur" }, { status: 404 });
    }

    // Get PRISE (taken) normal requests for this user
    const priseDemandes = await prisma.demande.findMany({
      where: {
        demandeurId: dbUser.demandeur.id,
        statut: "PRISE",
      },
      include: {
        produits: {
          include: {
            produit: true,
          },
        },
      },
    });

    // Get PRISE (taken) exceptional requests for this user
    const priseDemandesExceptionnelles = await prisma.demandeExceptionnelle.findMany({
      where: {
        demandeurId: dbUser.demandeur.id,
        statut: "PRISE",
      },
      include: {
        produitsExceptionnels: {
          include: {
            produitExceptionnel: true,
          },
        },
      },
    });

    // Define all months
    const months = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"];

    // Create a map to store product quantities by month
    const productsByMonth = new Map();

    // Initialize all months with empty product maps
    months.forEach(month => {
      productsByMonth.set(month, new Map());
    });

    // Get the list of all product names
    const allProductNames = new Set();

    // Process each PRISE normal request
    priseDemandes.forEach((demande: DemandeWithProduits) => {
      // Get the month name from the datePris (when it was taken)
      const takenDate = demande.datePris || demande.updatedAt;
      const monthIndex = takenDate.getMonth();
      const monthName = months[monthIndex];
      
      // Add the products from this request to the month
      demande.produits.forEach(item => {
        const productName = item.produit.nom;
        allProductNames.add(productName);
        
        const currentQuantity = productsByMonth.get(monthName).get(productName) || 0;
        productsByMonth.get(monthName).set(productName, currentQuantity + item.quantite);
      });
    });

    // Process each PRISE exceptional request
    priseDemandesExceptionnelles.forEach((demande: DemandeExceptionnelleWithProduits) => {
      // Get the month name from when it was taken (you might need to add datePris field to DemandeExceptionnelle)
      // For now, using updatedAt as approximation
      const takenDate = demande.updatedAt; // You might want to add datePris field
      const monthIndex = takenDate.getMonth();
      const monthName = months[monthIndex];
      
      // Add the exceptional products from this request to the month
      demande.produitsExceptionnels.forEach(item => {
        const productName = item.produitExceptionnel.name; // Note: 'name' not 'nom' for exceptional products
        allProductNames.add(productName + " (Exceptionnel)"); // Add suffix to distinguish
        
        const productKey = productName + " (Exceptionnel)";
        const currentQuantity = productsByMonth.get(monthName).get(productKey) || 0;
        productsByMonth.get(monthName).set(productKey, currentQuantity + item.quantite);
      });
    });

    // Convert the map to the format needed for the chart
    const monthlyData = months.map(month => {
      const monthData: Record<string, string | number> = { month };
      
      // Add all products to each month (with 0 if no data)
      allProductNames.forEach(productName => {
        monthData[productName as string] = productsByMonth.get(month).get(productName) || 0;
      });
      
      return monthData;
    });

    // Get statistics for additional info
    const totalNormalProducts = priseDemandes.reduce((total: number, demande: DemandeWithProduits) => {
      return total + demande.produits.reduce((subtotal, item) => subtotal + item.quantite, 0);
    }, 0);

    const totalExceptionalProducts = priseDemandesExceptionnelles.reduce((total: number, demande: DemandeExceptionnelleWithProduits) => {
      return total + demande.produitsExceptionnels.reduce((subtotal, item) => subtotal + item.quantite, 0);
    }, 0);

    return NextResponse.json({
      data: monthlyData,
      productNames: Array.from(allProductNames),
      statistics: {
        totalNormalProducts,
        totalExceptionalProducts,
        totalProducts: totalNormalProducts + totalExceptionalProducts,
        normalRequestsCount: priseDemandes.length,
        exceptionalRequestsCount: priseDemandesExceptionnelles.length
      }
    });
    
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
  }
}