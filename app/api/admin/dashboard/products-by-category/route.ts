
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch categories with their products
    const categoriesWithProducts = await prisma.categorie.findMany({
      include: {
        produits: {
          select: {
            nom: true,
            quantite: true,
          },
        },
      },
    });

    // Transform the data for the chart
    const data = categoriesWithProducts.map((category) => ({
      category: category.nom,
      productCount: category.produits.length,
      products: category.produits.map((p) => ({
        name: p.nom,
        quantity: p.quantite,
      })),
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}