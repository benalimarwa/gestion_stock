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
        score: true, // Add the score field
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            commandes: true,
            produits: true, // Include count of produits for consistency with screenshot
          },
        },
      },
      orderBy: produitIds.length > 0
        ? { score: "desc" } // Order by score when filtering by product IDs
        : { nom: "asc" },   // Otherwise, order by name
    });

    return NextResponse.json(fournisseurs);
  } catch (error) {
    console.error("Erreur GET /api/magasinier/fournisseur:", error);
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
    console.error("Erreur POST /api/magasinier/fournisseur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    await prisma.fournisseur.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Fournisseur supprimé" });
  } catch (error) {
    console.error("Erreur DELETE /api/magasinier/fournisseur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
