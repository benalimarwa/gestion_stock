import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Utiliser l'année actuelle pour les dates de début et de fin
    const currentYear = new Date().getFullYear();
    const startDate = new Date(`${currentYear}-01-01`);
    const endDate = new Date(`${currentYear}-03-31`);

    const demandes = await prisma.demande.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
      },
    });

    const demandesParMois = demandes.reduce((acc: { [key: string]: number }, demande) => {
      const mois = demande.createdAt.toLocaleString("fr-FR", { month: "long", year: "numeric" }); // Use French locale
      acc[mois] = (acc[mois] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(demandesParMois)
      .map(([mois, count]) => ({
        month: mois,
        demandes: Number(count),
      }))
      .sort((a, b) => {
        const [monthA, yearA] = a.month.split(" ");
        const [monthB, yearB] = b.month.split(" ");
        const dateA = new Date(`${monthA} 1, ${yearA}`.replace("janvier", "January").replace("février", "February").replace("mars", "March"));
        const dateB = new Date(`${monthB} 1, ${yearB}`.replace("janvier", "January").replace("février", "February").replace("mars", "March"));
        return dateA.getTime() - dateB.getTime();
      });

    console.log("API (Demandes): Chart Data:", chartData);
    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Erreur lors de la récupération des demandes par mois :", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
