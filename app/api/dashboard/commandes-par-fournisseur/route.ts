import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const commandes = await prisma.commande.findMany({
      include: {
        fournisseur: {
          select: { nom: true },
        },
      },
    });

    // Regrouper par fournisseur
    const commandesParFournisseur = commandes.reduce((acc, commande) => {
      const fournisseurNom = commande.fournisseur.nom;
      acc[fournisseurNom] = (acc[fournisseurNom] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Transformer en format pour Recharts
    const chartData = Object.entries(commandesParFournisseur).map(([fournisseur, count]) => ({
      fournisseur,
      commandes: Number(count),
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes par fournisseur :", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}