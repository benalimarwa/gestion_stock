import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const commandes = await prisma.commande.findMany({
      select: {
        date: true, // Date de la commande
      },
    });

    // Regrouper par mois
    const commandesParMois = commandes.reduce((acc, commande) => {
      const mois = commande.date.toLocaleString("default", { month: "long", year: "numeric" });
      acc[mois] = (acc[mois] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Transformer en format pour Recharts
    const chartData = Object.entries(commandesParMois).map(([mois, count]) => ({
      month: mois,
      commandes: Number(count),
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes par mois :", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}