import { NextResponse, NextRequest } from "next/server";
import { PrismaClient, StatutCommande } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const produitId = searchParams.get("produitId");
    const statut = (searchParams.get("statut") || "LIVREE") as StatutCommande;

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
    const validStatuts: StatutCommande[] = [
      "EN_COURS",
      "ANNULEE",
      "EN_RETOUR",
      "LIVREE",
      "VALIDE",
      "NON_VALIDE",
    ];
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

    // Trouver toutes les commandes avec ce produit et le statut spécifié
    const commandesProduit = await prisma.commandeProduit.findMany({
      where: {
        produitId,
        commande: {
          statut: statut, // Type-safe usage of statut
        },
      },
      include: {
        commande: {
          include: {
            fournisseur: {
              select: {
                nom: true,
              },
            },
          },
        },
      },
      orderBy: {
        commande: {
          datePrevu: "desc",
        },
      },
    });

    // Formatage des données
    const commandesFormattees = commandesProduit.map((cp) => ({
      id: cp.id,
      fournisseur: cp.commande.fournisseur ?? { nom: "Inconnu" },
      dateLivraison: cp.commande.datePrevu?.toISOString() || null,
      quantite: cp.quantite,
    }));

    return NextResponse.json(commandesFormattees);
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Erreur serveur: ${error.message}`
            : "Erreur inconnue lors de la récupération des commandes",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}