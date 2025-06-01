// app/api/magasinier/commandes/commandes-en-attente/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const pendingOrders = await prisma.commande.findMany({
      where: {
        statut: "EN_COURS", 
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
        createdAt: 'desc', // Utilise createdAt au lieu de date si "date" n'existe pas dans le modèle
      },
    });
    
    return NextResponse.json(pendingOrders);
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes en cours:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes en cours" },
      { status: 500 }
    );
  }
}