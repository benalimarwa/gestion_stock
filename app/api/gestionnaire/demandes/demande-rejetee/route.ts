// app/api/demande-rejetee/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Récupérer les demandes rejetées avec les données associées
    const rejectedRequests = await prisma.demande.findMany({
      where: {
        statut: "REJETEE",
      },
      include: {
        demandeur: {
          include: {
            user: true,  // Inclure les infos de l'utilisateur pour obtenir le nom
          },
        },
        produits: {
          include: {
            produit: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Formater les données pour le frontend
    const formattedRequests = rejectedRequests.map((demande) => ({
      requestId: demande.id,
      demandeurName: demande.demandeur.user.name || "Utilisateur sans nom", // Utiliser le nom de l'utilisateur
      demandeurId: demande.demandeurId,
      produits: demande.produits.map((item) => ({
        id: item.id,
        produitId: item.produitId,
        nom: item.produit.nom || "Produit sans nom",
        quantite: item.quantite,
      })),
      createdAt: demande.createdAt.toISOString(),
      raisonRefus: demande.raisonRefus, // Inclure la raison du refus
    }));

    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error("Erreur lors de la récupération des demandes rejetées:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des demandes rejetées" },
      { status: 500 }
    );
  }
}