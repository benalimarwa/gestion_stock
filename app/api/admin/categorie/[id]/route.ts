import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await the params in Next.js 15
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "L'ID de la catégorie est requis." }, { status: 400 });
    }

    const category = await prisma.categorie.findUnique({
      where: { id },
      include: {
        produits: true,
        _count: { select: { produits: true } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Catégorie non trouvée." }, { status: 404 });
    }

    return NextResponse.json(category, { status: 200 });
  } catch (error: any) {
    console.error("Erreur lors de la récupération de la catégorie:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la catégorie", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await the params in Next.js 15
    const { id } = await params;
    console.log("DELETE /api/admin/categorie/[id] called with ID:", id);

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

    if (category._count.produits > 0) {
      return NextResponse.json(
        { error: "Cette catégorie contient des produits et ne peut pas être supprimée." },
        { status: 400 }
      );
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await the params in Next.js 15
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: "L'ID de la catégorie est requis" },
        { status: 400 }
      );
    }

    const body = await req.json();
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