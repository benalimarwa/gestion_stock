import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    console.log("Received request to /api/demandeurUser/notifications");

    // Get the authenticated user's Clerk ID
    const { userId } = getAuth(req);
    console.log("Clerk userId:", userId);

    if (!userId) {
      console.error("No userId found in request");
      return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
    }

    // Find the user and associated demandeur
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: {
        demandeur: true,
      },
    });
    console.log("User found:", user);

    if (!user) {
      console.error("No user found for clerkUserId:", userId);
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    if (!user.demandeur) {
      console.error("User is not a demandeur:", user);
      return NextResponse.json({ error: "Utilisateur n'est pas un demandeur" }, { status: 404 });
    }

    // Fetch approved regular demands and delivered exceptional demands
    const [regularDemandes, exceptionalDemandes] = await Promise.all([
      prisma.demande.findMany({
        where: {
          demandeurId: user.demandeur.id,
          statut: "APPROUVEE",
        },
        include: {
          produits: {
            include: {
              produit: {
                select: {
                  nom: true,
                  marque: true,
                },
              },
            },
          },
        },
        orderBy: {
          dateApprouvee: "desc",
        },
      }),
      prisma.demandeExceptionnelle.findMany({
        where: {
          demandeurId: user.demandeur.id,
          statut: "LIVREE",
        },
        include: {
          produitsExceptionnels: {
            include: {
              produitExceptionnel: {
                select: {
                  name: true,
                  marque: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
    ]);
    console.log("Regular demandes found:", regularDemandes);
    console.log("Exceptional demandes found:", exceptionalDemandes);

    // Format the response
    const formattedDemandes = [
      ...regularDemandes.map((demande) => ({
        id: demande.id,
        type: "DEMANDE",
        dateApprouvee: demande.dateApprouvee?.toISOString() || null,
        createdAt: demande.createdAt.toISOString(),
        produits: demande.produits.map((p) => ({
          produit: {
            nom: p.produit.nom,
            marque: p.produit.marque || "Inconnu",
          },
          quantite: p.quantite,
        })),
      })),
      ...exceptionalDemandes.map((demande) => ({
        id: demande.id,
        type: "DEMANDE_EXCEPTIONNELLE",
        dateApprouvee: demande.dateApprouvee?.toISOString() || null,
        createdAt: demande.createdAt.toISOString(),
        produits: demande.produitsExceptionnels.map((p) => ({
          produit: {
            nom: p.produitExceptionnel.name,
            marque: p.produitExceptionnel.marque || "Inconnu",
          },
          quantite: p.quantite,
        })),
      })),
    ];

    console.log("Formatted demandes:", formattedDemandes);
    return NextResponse.json(formattedDemandes);
  } catch (error) {
    console.error("Erreur dans GET /api/demandeurUser/notifications:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}