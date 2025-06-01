// app/api/magasinier/commandes/commandes-en-retour/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";

// Use Prisma's generated type for the query result
type CommandeWithIncludes = Prisma.CommandeGetPayload<{
  include: {
    fournisseur: {
      select: {
        id: true;
        nom: true;
      };
    };
    produits: {
      include: {
        produit: true;
      };
    };
  };
}>;

export async function GET(request: NextRequest) {
  try {
    const returnedOrders: CommandeWithIncludes[] = await prisma.commande.findMany({
      where: {
        statut: 'EN_RETOUR',
      },
      include: {
        fournisseur: {
          select: {
            id: true,
            nom: true,
          },
        },
        produits: {
          include: {
            produit: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Now TypeScript knows the exact structure of order and item
    const formattedOrders = returnedOrders.map((order) => ({
      id: order.id,
      fournisseur: order.fournisseur || { id: "", nom: "Fournisseur inconnu" },
      produits: order.produits.map((item) => ({
        produit: {
          id: item.produit.id,
          nom: item.produit.nom,
          quantite: item.produit.quantite
        },
        quantite: item.quantite
      })),
      statut: "EN_RETOUR" as const,
      date: order.createdAt.toISOString(),
      raisonRetour: order.raisonRetour
    }));

    return NextResponse.json(formattedOrders);
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes en retour:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes en retour" },
      { status: 500 }
    );
  }
}