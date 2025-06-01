import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { Role, StatutDemande, StatutDemandeExceptionnelle, Demande, DemandeProduit, Produit, DemandeExceptionnelle, DemandeProduitExceptionnel, ProduitExceptionnel } from "@prisma/client";

// Define type for Demande with included produits
type DemandeWithProduitsApprouvee = Demande & {
  produits: (DemandeProduit & {
    produit: {
      id: string;
      nom: string;
      quantite: number;
      marque: string | null;
    };
  })[];
};

// Define type for DemandeExceptionnelle with included produitsExceptionnels
type DemandeExceptionnelleWithProduitsApprouvee = DemandeExceptionnelle & {
  produitsExceptionnels: (DemandeProduitExceptionnel & {
    produitExceptionnel: {
      id: string;
      name: string;
      marque: string | null;
      description: string | null;
    };
  })[];
};

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      console.error("No authenticated user found");
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
    });

    if (!dbUser) {
      console.error("User not found:", user.id);
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    if (dbUser.role !== Role.DEMANDEUR) {
      console.error("User does not have DEMANDEUR role:", dbUser.id);
      return NextResponse.json(
        { error: "Accès non autorisé. Vous devez être un demandeur." },
        { status: 403 }
      );
    }

    const demandeur = await prisma.demandeur.findUnique({
      where: { userId: dbUser.id },
    });

    if (!demandeur) {
      console.log("No Demandeur record found for user:", dbUser.id);
      return NextResponse.json([]);
    }

    const demandes = await prisma.demande.findMany({
      where: {
        demandeurId: demandeur.id,
        statut: StatutDemande.APPROUVEE,
      },
      include: {
        produits: {
          include: {
            produit: {
              select: {
                id: true,
                nom: true, // Corrected from 'name' to 'nom'
                quantite: true,
                marque: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc", // Changed from 'dateApprouvee' to 'updatedAt'
      },
    });

    const demandesExceptionnelles = await prisma.demandeExceptionnelle.findMany({
      where: {
        demandeurId: demandeur.id,
        statut: {
          in: [
            StatutDemandeExceptionnelle.ACCEPTEE,
            StatutDemandeExceptionnelle.COMMANDEE,
            StatutDemandeExceptionnelle.LIVREE,
          ],
        },
      },
      include: {
        produitsExceptionnels: {
          include: {
            produitExceptionnel: {
              select: {
                id: true,
                name: true, // Correct for ProduitExceptionnel
                marque: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const combinedDemandes = [
      ...demandes.map((demande: DemandeWithProduitsApprouvee) => ({
        ...demande,
        type: "REGULIERE",
        produitsExceptionnels: [], // Ensure no produitsExceptionnels for Demande
      })),
      ...demandesExceptionnelles.map((demande: DemandeExceptionnelleWithProduitsApprouvee) => ({
        ...demande,
        type: "EXCEPTIONNELLE",
        produits: [], // Ensure no produits for DemandeExceptionnelle
      })),
    ];

    console.log("Approved requests fetched:", combinedDemandes.length);
    return NextResponse.json(combinedDemandes);
  } catch (error: any) {
    console.error("Erreur lors de la récupération des demandes approuvées:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des demandes", details: error.message },
      { status: 500 }
    );
  }
}