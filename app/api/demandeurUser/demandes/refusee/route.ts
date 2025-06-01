import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/db';
import { currentUser } from "@clerk/nextjs/server";
import { Demande, DemandeProduit, Produit } from "@prisma/client";

// Define type for DemandeProduit with included Produit (select subset)
type DemandeProduitWithSelectedProduit = DemandeProduit & {
  produit: {
    id: string;
    nom: string;
  };
};

// Define type for Demande with included produits
type DemandeWithProduitsRefusee = Demande & {
  produits: DemandeProduitWithSelectedProduit[];
};

export async function GET(req: NextRequest) {
  try {
    // Récupérer l'utilisateur actuellement connecté
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Trouver l'utilisateur dans la base de données par son ID Clerk
    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
      include: {
        demandeur: true,
      },
    });

    if (!dbUser || !dbUser.demandeur) {
      return NextResponse.json({ error: "Utilisateur non trouvé ou n'est pas un demandeur" }, { status: 404 });
    }

    // Récupérer toutes les demandes refusées de ce demandeur
    const refusedDemandes = await prisma.demande.findMany({
      where: {
        demandeurId: dbUser.demandeur.id,
        statut: "REJETEE",
      },
      include: {
        produits: {
          include: {
            produit: {
              select: {
                id: true,
                nom: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transformer les données pour qu'elles correspondent au format attendu par le front-end
    const formattedDemandes = refusedDemandes.map((demande: DemandeWithProduitsRefusee) => ({
      id: demande.id,
      statut: demande.statut,
      dateApprouvee: demande.dateApprouvee,
      raisonRefus: demande.raisonRefus,
      createdAt: demande.createdAt.toISOString(),
      produits: demande.produits.map(item => ({
        produit: {
          id: item.produit.id,
          nom: item.produit.nom,
          quantite: 0, // Cette valeur sera remplacée par la quantité de la demande
        },
        quantite: item.quantite,
      })),
    }));

    return NextResponse.json(formattedDemandes);
  } catch (error) {
    console.error("Erreur lors de la récupération des demandes refusées:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}