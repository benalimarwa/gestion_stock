// app/api/magasinier/commandes/commandes-en-retour/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";

// Define the type for the order data returned from Prisma
type ReturnedOrderWithIncludes = Prisma.CommandeGetPayload<{
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

// Type for the product item within the order
type OrderProductItem = {
  produit: {
    id: string;
    nom: string;
    quantite: number;
    // Add other product properties as needed
  };
  quantite: number;
  produitId: string;
  // Add other order-product relationship properties as needed
};

export async function GET(request: NextRequest) {
  try {
    const returnedOrders = await prisma.commande.findMany({
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
        createdAt: 'desc', // Utiliser createdAt au lieu de date
      },
    }) as ReturnedOrderWithIncludes[];

    // Transformer les données pour être compatibles avec le frontend
    const formattedOrders = returnedOrders.map((order: ReturnedOrderWithIncludes) => ({
      id: order.id,
      fournisseur: order.fournisseur || { id: "", nom: "Fournisseur inconnu" },
      produits: order.produits.map((item: OrderProductItem) => ({
        produit: {
          id: item.produit.id,
          nom: item.produit.nom,
          quantite: item.produit.quantite
        },
        quantite: item.quantite
      })),
      statut: "EN_RETOUR" as const,
      date: order.createdAt.toISOString(), // Convertir createdAt en date pour le frontend
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