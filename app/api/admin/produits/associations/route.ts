import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Récupérer les produits ayant des commandes livrées
    const commandesLivrees = await db.commandeProduit.findMany({
      where: {
        commande: {
          statut: "LIVREE",
        },
      },
      select: {
        produitId: true,
      },
      distinct: ["produitId"],
    });

    // Récupérer les produits ayant des demandes approuvées
    const demandesApprouvees = await db.demandeProduit.findMany({
      where: {
        demande: {
          statut: "APPROUVEE",
        },
      },
      select: {
        produitId: true,
      },
      distinct: ["produitId"],
    });

    // Combiner les IDs des produits avec des commandes livrées ou des demandes approuvées
    const productIds = new Set([
      ...commandesLivrees.map((c: { produitId: string }) => c.produitId),
      ...demandesApprouvees.map((d: { produitId: string }) => d.produitId),
    ]);

    return NextResponse.json([...productIds], { status: 200 });
  } catch (error) {
    console.error("Erreur GET /api/admin/produits/associations:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
