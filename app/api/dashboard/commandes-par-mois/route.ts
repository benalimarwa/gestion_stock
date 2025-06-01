// /api/dashboard/commandes-par-mois/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const commandesParMois = await prisma.commande.groupBy({
      by: ['createdAt'],
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Transformer les données pour le format attendu par le graphique
    const formattedData = commandesParMois.map((entry) => {
      const date = new Date(entry.createdAt);
      const month = date.toLocaleString('default', { month: 'long', year: 'numeric' }); // Ex: "Janvier 2025"
      return {
        month,
        commandes: entry._count.id,
      };
    });

    interface MonthlyCommandData {
  month: string;
  commandes: number;
}

// Fusionner les données pour éviter les doublons (si plusieurs entrées pour le même mois)
    const mergedData = formattedData.reduce((acc: MonthlyCommandData[], curr: MonthlyCommandData) => {
      const existing = acc.find((item) => item.month === curr.month);
      if (existing) {
        existing.commandes += curr.commandes;
      } else {
        acc.push(curr);
      }
      return acc;
    }, []);

    return NextResponse.json(mergedData, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes par mois:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}