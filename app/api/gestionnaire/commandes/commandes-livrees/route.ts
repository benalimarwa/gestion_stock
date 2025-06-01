// app/api/gestionnaire/commandes/commandes-livrees/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Utilisateur non authentifié" }, { status: 401 });
    }

    // Optionally, verify the user's role (e.g., GESTIONNAIRE) using Clerk or your role system
    const deliveredOrders = await prisma.commande.findMany({
      where: { statut: "LIVREE" },
      include: {
        fournisseur: true,
        produits: {
          include: { produit: true },
        },
      },
    });

    return NextResponse.json(deliveredOrders);
  } catch (error) {
    console.error("Error fetching delivered orders:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes"},
      { status: 500 }
    );
  }
}