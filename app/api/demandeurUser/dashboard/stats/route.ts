import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

import { Demande, DemandeProduit, DemandeExceptionnelle, DemandeProduitExceptionnel } from "@prisma/client";

// Define type for Demande with included produits
type DemandeWithProduits = Demande & {
  produits: DemandeProduit[];
};

// Define type for DemandeExceptionnelle with included produitsExceptionnels
type DemandeExceptionnelleWithProduits = DemandeExceptionnelle & {
  produitsExceptionnels: DemandeProduitExceptionnel[];
};

export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Get the user from database with the clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
      include: { demandeur: true }
    });

    if (!dbUser || !dbUser.demandeur) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const demandeurId = dbUser.demandeur.id;

    // Count approved items from normal demands (PRISE status)
    const approvedDemandes = await prisma.demande.findMany({
      where: {
        demandeurId,
        statut: "PRISE" // Changed from APPROUVEE to PRISE for taken items
      },
      include: {
        produits: true
      }
    });

    // Calculate total of all approved items from normal demands
    const approvedItemsFromNormal = approvedDemandes.reduce((total: number, demande: DemandeWithProduits) => {
      return total + demande.produits.reduce((subtotal, produit) => {
        return subtotal + produit.quantite;
      }, 0);
    }, 0);

    // Count approved items from exceptional demands (PRISE status)
    const approvedDemandesExceptionnelles = await prisma.demandeExceptionnelle.findMany({
      where: {
        demandeurId,
        statut: "PRISE" // Status for taken exceptional demands
      },
      include: {
        produitsExceptionnels: true
      }
    });

    // Calculate total of all approved items from exceptional demands
    const approvedItemsFromExceptional = approvedDemandesExceptionnelles.reduce((total: number, demande: DemandeExceptionnelleWithProduits) => {
      return total + demande.produitsExceptionnels.reduce((subtotal, produit) => {
        return subtotal + produit.quantite;
      }, 0);
    }, 0);

    // Total approved items (normal + exceptional)
    const approvedItems = approvedItemsFromNormal + approvedItemsFromExceptional;

    // Count pending requests from normal demands
    const pendingRequests = await prisma.demande.count({
      where: {
        demandeurId,
        statut: "EN_ATTENTE"
      }
    });

    // Count pending requests from exceptional demands
    const pendingExceptionalRequests = await prisma.demandeExceptionnelle.count({
      where: {
        demandeurId,
        statut: "EN_ATTENTE"
      }
    });

    // Total pending requests (normal + exceptional)
    const totalPendingRequests = pendingRequests + pendingExceptionalRequests;

    // Get detailed stats for chart (optional - for future use)
    const chartData = {
      normalDemands: {
        prise: approvedItemsFromNormal,
        enAttente: pendingRequests,
        approuvee: await prisma.demande.count({
          where: { demandeurId, statut: "APPROUVEE" }
        }),
        rejetee: await prisma.demande.count({
          where: { demandeurId, statut: "REJETEE" }
        })
      },
      exceptionalDemands: {
        prise: approvedItemsFromExceptional,
        enAttente: pendingExceptionalRequests,
        acceptee: await prisma.demandeExceptionnelle.count({
          where: { demandeurId, statut: "ACCEPTEE" }
        }),
        rejetee: await prisma.demandeExceptionnelle.count({
          where: { demandeurId, statut: "REJETEE" }
        })
      }
    };

    return NextResponse.json({
      approvedItems, // Total items taken (normal + exceptional)
      pendingRequests: totalPendingRequests, // Total pending requests (normal + exceptional)
      lateReturns: 0, // Placeholder for future implementation
      chartData // Detailed data for charts
    });

  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json({ 
      error: "Erreur lors de la récupération des statistiques" 
    }, { status: 500 });
  }
}
