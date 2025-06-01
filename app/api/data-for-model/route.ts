import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch all orders with relevant fields
    const commandes = await prisma.commande.findMany({
      select: {
        id: true,
        fournisseurId: true,
        statut: true,
        datePrevu: true,
        date: true,
        createdAt: true,
        produits: {
          select: {
            quantite: true,
          },
        },
      },
    });

    // Compute features for each order
    const data = commandes.map(commande => {
      // Handle potential null value for datePrevu
      const validDatePrevu: Date = commande.datePrevu ? new Date(commande.datePrevu) : new Date(commande.date); // Use commande.date as fallback
      const date = new Date(commande.date);
      const delayDays = (date.getTime() - validDatePrevu.getTime()) / (1000 * 60 * 60 * 24); // Delay in days
      const isLate = delayDays > 0 ? 1 : 0; // Add explicit is_late feature
      const hasReturn = commande.statut === "EN_RETOUR" ? 1 : 0;
      const isCanceled = commande.statut === "ANNULEE" ? 1 : 0;
      const totalQuantity = commande.produits.reduce((sum, p) => sum + p.quantite, 0);

      return {
        fournisseurId: commande.fournisseurId,
        delay_days: delayDays,
        is_late: isLate, // Add is_late explicit field
        has_return: hasReturn,
        total_quantity: totalQuantity,
        is_canceled: isCanceled,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching data for model:", error);
    return NextResponse.json({ error: "Failed to fetch data for model" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}