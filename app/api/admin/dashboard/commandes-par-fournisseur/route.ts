import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch all commandes with their fournisseur
    const commandes = await prisma.commande.findMany({
      include: {
        fournisseur: {
          select: { nom: true },
        },
      },
    });

    // Fetch all fournisseurs
    const fournisseurs = await prisma.fournisseur.findMany({
      select: { nom: true },
    });

    // Count commandes per fournisseur
    const commandesParFournisseur: Record<string, number> = commandes.reduce(
      (acc: Record<string, number>, commande) => {
        const fournisseurNom = commande.fournisseur.nom;
        acc[fournisseurNom] = (acc[fournisseurNom] || 0) + 1;
        return acc;
      },
      {}
    );

    // Create chart data, including all fournisseurs (even those with 0 commandes)
    const chartData = fournisseurs.map((fournisseur) => ({
      fournisseur: fournisseur.nom,
      commandes: commandesParFournisseur[fournisseur.nom] || 0,
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes par fournisseur :", error);
    return NextResponse.json({ error: "Échec de la récupération des données" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
