// app/api/users/[id]/details/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } =await params;

    if (!id) {
      return NextResponse.json(
        { error: "L'ID de l'utilisateur est requis" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        role: true,
        demandeur: {
          select: {
            demandes: {
              select: {
                id: true,
                statut: true,
                createdAt: true,
                produits: {
                  select: {
                    produit: {
                      select: { nom: true },
                    },
                    quantite: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    let details: { commandes?: any[]; demandes?: any[]; acceptedDemandes?: any[] } = {};

    if (user.role === "ADMIN") {
      // Workaround: Fetch all Commande (no direct link to User/AdminAchat)
      const commandes = await prisma.commande.findMany({
        select: {
          id: true,
          statut: true,
          date: true,
          createdAt: true,
          produits: {
            select: {
              produit: { select: { nom: true } },
              quantite: true,
            },
          },
        },
      });
      details.commandes = commandes;
    } else if (user.role === "DEMANDEUR" && user.demandeur) {
      details.demandes = user.demandeur.demandes;
    } else if (user.role === "MAGASINNIER") {
      // Workaround: Fetch all APPROUVEE Demandes (no link to Gestionnaire)
      const acceptedDemandes = await prisma.demande.findMany({
        where: { statut: "APPROUVEE" },
        select: {
          id: true,
          statut: true,
          createdAt: true,
          produits: {
            select: {
              produit: { select: { nom: true } },
              quantite: true,
            },
          },
        },
      });
      details.acceptedDemandes = acceptedDemandes;
    }

    return NextResponse.json(details);
  } catch (error) {
    console.error("Erreur lors de la récupération des détails:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des détails" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}