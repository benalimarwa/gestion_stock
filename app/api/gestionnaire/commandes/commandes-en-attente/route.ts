// app/api/commandes-annulees/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const cancelledOrders = await prisma.commande.findMany({
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
        date: 'desc',
      },
    });

    return NextResponse.json(cancelledOrders);
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes annulées:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes annulées" },
      { status: 500 }
    );
  }
}