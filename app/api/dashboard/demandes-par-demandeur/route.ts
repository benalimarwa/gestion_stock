// app/api/dashboard/demandes-par-demandeur/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Adjust this import based on your Prisma setup
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get("timeRange") || "12m";

  const monthsToSubtract = parseInt(timeRange.replace("m", ""), 10) || 12;
  const startDate = startOfMonth(subMonths(new Date(), monthsToSubtract));
  const endDate = endOfMonth(new Date());

  try {
    const demandes = await prisma.demande.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        demandeur: {
          include: {
            user: true,
          },
        },
        produits: true,
      },
    });

    const demandByMonthAndDemandeur: { [month: string]: { [demandeur: string]: number } } = {};

    demandes.forEach((demande) => {
      const month = format(demande.createdAt, "MMMM");
      const demandeurName = demande.demandeur.user.name || "Unknown";

      if (!demandByMonthAndDemandeur[month]) {
        demandByMonthAndDemandeur[month] = {};
      }
      if (!demandByMonthAndDemandeur[month][demandeurName]) {
        demandByMonthAndDemandeur[month][demandeurName] = 0;
      }
      demandByMonthAndDemandeur[month][demandeurName] += 1;
    });

    const chartData = Object.entries(demandByMonthAndDemandeur).map(([month, demandeurs]) => ({
      month,
      ...demandeurs,
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Error fetching demands by demandeur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}