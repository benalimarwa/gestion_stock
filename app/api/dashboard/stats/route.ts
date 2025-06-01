import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const ordersCount = await prisma.commande.count();
    const usersCount = await prisma.user.count();
    const suppliersCount = await prisma.fournisseur.count();
    const acceptedDemandsCount = await prisma.demande.count({
      where: { statut: "APPROUVEE" },
    });

    return NextResponse.json(
      {
        ordersCount,
        usersCount,
        suppliersCount,
        acceptedDemandsCount, // Ensure this is included
      },
      { status: 200 }
    );
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