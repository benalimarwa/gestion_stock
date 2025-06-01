import { NextResponse, NextRequest } from "next/server";
import { PrismaClient, StatutDemande } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const produitId = searchParams.get("produitId");
    const statut = (searchParams.get("statut") || "APPROUVEE") as StatutDemande;

    if (!produitId) {
      return NextResponse.json(
        { error: "L'ID du produit est requis" },
        { status: 400 }
      );
    }

    // Validation que le produit existe
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
    });

    if (!produit) {
      return NextResponse.json(
        { error: "Produit non trouvé" },
        { status: 404 }
      );
    }

    // Validation du statut
    const validStatuts: StatutDemande[] = ["EN_ATTENTE", "APPROUVEE", "REJETEE"];
    if (!validStatuts.includes(statut)) {
      return NextResponse.json(
        {
          error: `Statut invalide: ${statut}. Valeurs attendues: ${validStatuts.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Trouver toutes les demandes avec ce produit et le statut spécifié
    const demandesProduit = await prisma.demandeProduit.findMany({
      where: {
        produitId,
        demande: {
          statut: statut, // Type-safe usage of statut
        },
      },
      include: {
        demande: {
          include: {
            demandeur: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Formatage des données
    const demandesFormattees = demandesProduit.map((dp) => ({
      id: dp.id,
      demandeur: dp.demande.demandeur ?? { user: { name: "Inconnu" } },
      dateApprouvee: dp.demande.dateApprouvee?.toISOString() || null,
      quantite: dp.quantite,
    }));

    return NextResponse.json(demandesFormattees);
  } catch (error) {
    console.error("Erreur lors de la récupération des demandes:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Erreur serveur: ${error.message}`
            : "Erreur inconnue lors de la récupération des demandes",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}