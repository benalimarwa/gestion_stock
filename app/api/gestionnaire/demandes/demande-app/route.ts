// app/api/demande-app/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch approved requests with related data
    const approvedRequests = await prisma.demande.findMany({
      where: {
        statut: "APPROUVEE",
      },
      include: {
        demandeur: {
          include: {
            user: true, // Include the user related to the demandeur
          },
        },
        produits: {
          include: {
            produit: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Format the data for the frontend
    const formattedRequests = approvedRequests.map((demande) => ({
      requestId: demande.id,
      demandeurName: demande.demandeur.user.name || "Utilisateur sans nom", // Use the user's name
      produits: demande.produits.map((item) => ({
        nom: item.produit.nom || "Produit sans nom",
        quantite: item.quantite,
        id: item.produitId
      })),
      createdAt: demande.createdAt.toISOString(),
      updatedAt: demande.updatedAt.toISOString(),
    }));

    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error("Error fetching approved requests:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des demandes approuvées" },
      { status: 500 }
    );
  }
}