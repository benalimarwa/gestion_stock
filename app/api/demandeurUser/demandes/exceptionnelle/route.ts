import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // Extract userId from query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

   
    // Fetch exceptional requests for the provided userId
    const demandes = await prisma.demandeExceptionnelle.findMany({
      
      include: {
        produitsExceptionnels: {
          include: {
            produitExceptionnel: true,
          },
        },
      },
    });

    // Map to match client-side expected format
    const formattedDemandes = demandes.map((demande) => ({
      id: demande.id,
      produitsExceptionnels: demande.produitsExceptionnels.map((produit) => ({
        id: produit.id,
        produitExceptionnelId: produit.produitExceptionnelId,
        produitExceptionnel: {
          id: produit.produitExceptionnel.id,
          name: produit.produitExceptionnel.name,
          marque: produit.produitExceptionnel.marque,
          description: produit.produitExceptionnel.description,
        },
        quantite: produit.quantite,
      })),
      statut: demande.statut,
      createdAt: demande.createdAt.toISOString(),
      demandeurId: demande.demandeurId,
      dateApprouvee: demande.dateApprouvee?.toISOString() ?? null,
      raisonRefus: demande.raisonRefus ?? null,
    }));

    console.log(`Successfully fetched ${formattedDemandes.length} exceptional requests for user`, {
      endpoint: "/api/demandeurUser/demandes/exceptionnelles",
      userId,
    });

    return NextResponse.json(formattedDemandes, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching exceptional requests:", {
      endpoint: "/api/demandeurUser/demandes/exceptionnelles",
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des demandes exceptionnelles" },
      { status: 500 }
    );
  }
}