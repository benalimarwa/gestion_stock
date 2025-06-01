import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get("timeRange") || "12m";

  const monthsToSubtract = parseInt(timeRange.replace("m", ""), 10) || 12;
  const endDate = endOfMonth(new Date());
  const startDate = startOfMonth(subMonths(endDate, monthsToSubtract - 1));

  try {
    const demandes = await prisma.demande.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        statut: "APPROUVEE",
      },
      include: {
        demandeur: {
          include: {
            user: true,
          },
        },
      },
    });

    console.log(`Fetched ${demandes.length} demands between ${startDate} and ${endDate}`);

    const demandByMonthAndDemandeur: { [month: string]: { [demandeur: string]: number } } = {};

    demandes.forEach((demande) => {
      const month = format(demande.createdAt, "MMMM yyyy");
      
      // Logique améliorée pour obtenir le nom du demandeur
      let demandeurName = "Demandeur Inconnu";
      
      if (demande.demandeur?.user) {
        // Priorité 1: nom complet (name)
        if (demande.demandeur.user.name) {
          demandeurName = demande.demandeur.user.name;
        }
        // Priorité 2: prénom + nom (firstName + lastName)
        else if (demande.demandeur.user.firstName || demande.demandeur.user.lastName) {
          const firstName = demande.demandeur.user.firstName || "";
          const lastName = demande.demandeur.user.lastName || "";
          demandeurName = `${firstName} ${lastName}`.trim();
        }
        // Priorité 3: email (partie avant @)
        else if (demande.demandeur.user.email) {
          demandeurName = demande.demandeur.user.email.split('@')[0];
        }
      }
      
      // Si aucun nom n'est trouvé, utiliser un identifiant basé sur l'ID
      if (demandeurName === "Demandeur Inconnu" && demande.demandeur?.id) {
        demandeurName = `Demandeur ${demande.demandeur.id.slice(0, 8)}`;
      }

      if (!demandByMonthAndDemandeur[month]) {
        demandByMonthAndDemandeur[month] = {};
      }
      if (!demandByMonthAndDemandeur[month][demandeurName]) {
        demandByMonthAndDemandeur[month][demandeurName] = 0;
      }
      demandByMonthAndDemandeur[month][demandeurName] += 1;
    });

    // Créer un tableau ordonné chronologiquement
    const sortedMonths = Object.keys(demandByMonthAndDemandeur).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const chartData = sortedMonths.map((month) => ({
      month,
      ...demandByMonthAndDemandeur[month],
    }));

    console.log("Demands by demandeur data:", chartData);
    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Error fetching demands by demandeur:", error);
    return NextResponse.json(
      { 
        error: "Erreur lors de la récupération des données", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
