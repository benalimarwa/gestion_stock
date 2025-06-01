import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const demandes = await prisma.demande.findMany({
      select: {
        createdAt: true, // Date de création de la demande
      },
    });

    // Regrouper par mois
    const demandesParMois = demandes.reduce((acc, demande) => {
      const mois = demande.createdAt.toLocaleString("default", { month: "long", year: "numeric" });
      acc[mois] = (acc[mois] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Transformer en format pour Recharts
    const chartData = Object.entries(demandesParMois).map(([mois, count]) => ({
      month: mois,
      demandes: Number(count),
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Erreur lors de la récupération des demandes par mois :", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}