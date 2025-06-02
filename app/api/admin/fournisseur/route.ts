import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const produitIds = url.searchParams.get("produitIds")?.split(",").filter(id => id) || [];

    const fournisseurs = await prisma.fournisseur.findMany({
      where: produitIds.length > 0
        ? {
            produits: {
              some: {
                produitId: { in: produitIds },
              },
            },
          }
        : {},
      select: {
        id: true,
        nom: true,
        contact: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            commandes: true,
            produits: true,
            demandesExceptionnelles: true, // Ajout du compte des demandes exceptionnelles
          },
        },
      },
      orderBy: produitIds.length > 0
        ? { score: "desc" }
        : { nom: "asc" },
    });

    return NextResponse.json(fournisseurs);
  } catch (error) {
    console.error("Erreur GET /api/admin/fournisseur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  try {
    const { nom, contact, produitIds } = await request.json();

    if (!nom?.trim() || !contact?.trim()) {
      return NextResponse.json({ error: "Nom et contact requis" }, { status: 400 });
    }

    const fournisseur = await prisma.fournisseur.create({
      data: {
        nom: nom.trim(),
        contact: contact.trim(),
        score: 100, // Default score for new suppliers
        produits: produitIds?.length
          ? {
              create: produitIds.map((produitId: string) => ({
                produitId,
              })),
            }
          : undefined,
      },
      include: {
        _count: {
          select: {
            commandes: true,
            produits: true, // Include count of produits
          },
        },
      },
    });

    return NextResponse.json(fournisseur, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/admin/fournisseur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "ID requis et valide" }, { status: 400 });
    }

    // Vérifier si le fournisseur existe avant de le supprimer
    const existingFournisseur = await prisma.fournisseur.findUnique({
      where: { id },
    });

    if (!existingFournisseur) {
      return NextResponse.json({ error: "Fournisseur non trouvé" }, { status: 404 });
    }

    // Supprimer directement le fournisseur
    // Les relations seront gérées par Prisma selon la configuration du schéma
    await prisma.fournisseur.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Fournisseur supprimé avec succès" });
  } catch (error) {
    console.error("Erreur DELETE /api/admin/fournisseur:", error);
    
    // Gérer les erreurs de contrainte de clé étrangère
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: "Impossible de supprimer: le fournisseur est lié à d'autres données" }, 
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Erreur serveur", details: error instanceof Error ? error.message : "Erreur inconnue" }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}