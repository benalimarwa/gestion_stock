import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const produits = await prisma.produit.findMany({
      select: {
        nom: true,
        quantite: true,
        categorie: {
          select: { nom: true },
        },
      },
    });

    const stockByCategory = produits.reduce((acc, produit) => {
      const category = produit.categorie.nom;
      acc[category] = (acc[category] || 0) + produit.quantite;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(stockByCategory).map(([category, stock], index) => ({
      category,
      stock,
      fill: ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#a4de6c"][index % 5],
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Erreur dans GET /api/dashboard/stock:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}