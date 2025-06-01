import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/categorie - Récupérer toutes les catégories ou une catégorie spécifique
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      // Récupérer une catégorie spécifique avec ses produits
      const categorie = await prisma.categorie.findUnique({
        where: { id },
        include: {
          produits: true,
          _count: {
            select: {
              produits: true,
            },
          },
        },
      });

      if (!categorie) {
        return NextResponse.json(
          { error: "Catégorie non trouvée" },
          { status: 404 }
        );
      }

      return NextResponse.json(categorie);
    } else {
      // Récupérer toutes les catégories
      const categories = await prisma.categorie.findMany({
        include: {
          _count: {
            select: {
              produits: true,
            },
          },
        },
      });

      return NextResponse.json(categories);
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des catégories" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/categorie - Créer une nouvelle catégorie
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nom, description } = body;

    if (!nom || !description) {
      return NextResponse.json(
        { error: "Le nom et la description de la catégorie sont requis" },
        { status: 400 }
      );
    }

    const categorie = await prisma.categorie.create({
      data: {
        nom,
        description,
      },
    });

    return NextResponse.json(categorie, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la catégorie:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la catégorie" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT /api/categorie?id=xxx - Mettre à jour une catégorie
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: "L'ID de la catégorie est requis" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { nom, description } = body;

    if (!nom && !description) {
      return NextResponse.json(
        { error: "Au moins un champ à mettre à jour est requis" },
        { status: 400 }
      );
    }

    const updatedData: { nom?: string; description?: string } = {};
    if (nom) updatedData.nom = nom;
    if (description) updatedData.description = description;

    const categorie = await prisma.categorie.update({
      where: { id },
      data: updatedData,
    });

    return NextResponse.json(categorie);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la catégorie:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la catégorie" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE /api/categorie?id=xxx - Supprimer une catégorie
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    console.log("DELETE /api/categorie called with ID:", id);

    if (!id || typeof id !== "string" || id.trim() === "") {
      console.error("Invalid ID provided:", id);
      return NextResponse.json(
        { error: "L'ID de la catégorie est requis et doit être valide." },
        { status: 400 }
      );
    }

    const category = await prisma.categorie.findUnique({
      where: { id },
      include: { _count: { select: { produits: true } } },
    });

    if (!category) {
      console.warn("Category not found for ID:", id);
      return NextResponse.json({ error: "Catégorie non trouvée." }, { status: 404 });
    }

    // Delete associated products to avoid foreign key constraints
    if (category._count.produits > 0) {
      await prisma.produit.deleteMany({
        where: { categorieId: id },
      });
    }

    await prisma.categorie.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Catégorie supprimée avec succès." }, { status: 200 });
  } catch (error: any) {
    console.error("Erreur lors de la suppression de la catégorie:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la suppression de la catégorie",
        details: error.message || "Erreur inconnue",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}