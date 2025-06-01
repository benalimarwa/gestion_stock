import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { products } = await req.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Aucun produit fourni" }, { status: 400 });
    }

    const existingProducts = await prisma.produitExceptionnel.findMany({
      where: {
        name: { in: products.map((p: { name: string }) => p.name) },
      },
    });

    return NextResponse.json(existingProducts);
  } catch (error: any) {
    console.error("Erreur lors de la vérification des produits exceptionnels:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la vérification des produits", details: error.message },
      { status: 500 }
    );
  }
}