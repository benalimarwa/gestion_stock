// app/api/magasinier/commandes/commandes-livrees/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const returnedOrders = await prisma.commande.findMany({
      where: {
        statut: 'LIVREE',
      },
      include: {
        fournisseur: {
          select: {
            id: true,
            nom: true,
            contact: true,
          },
        },
        produits: {
          include: {
            produit: true,
          },
        },
      },
      orderBy: {
        dateLivraison: 'desc',
      },
    });
    
    return NextResponse.json(returnedOrders);
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes livrées:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes livrées" },
      { status: 500 }
    );
  }
}