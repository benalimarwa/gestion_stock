import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string } >}
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "L'ID de la catégorie est requis." },
        { status: 400 }
      );
    }

    const category = await prisma.categorie.findUnique({
      where: { id },
      include: { _count: { select: { produits: true } } },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Catégorie non trouvée." },
        { status: 404 }
      );
    }

    if (category._count.produits > 0) {
      await prisma.produit.deleteMany({
        where: { categorieId: id },
      });
    }

    await prisma.categorie.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Catégorie supprimée avec succès." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erreur lors de la suppression de la catégorie:", error);
    
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error: "Impossible de supprimer la catégorie en raison de contraintes de clé étrangère.",
        },
        { status: 400 }
      );
    }
    
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