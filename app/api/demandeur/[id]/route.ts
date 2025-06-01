// app/api/demandeur/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string } >}) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "L'ID du demandeur est requis" },
        { status: 400 }
      );
    }

    const demandeur = await prisma.demandeur.findUnique({
      where: { id },
    });

    if (!demandeur) {
      return NextResponse.json(
        { error: "Demandeur non trouvé" },
        { status: 404 }
      );
    }

    await prisma.demandeur.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Demandeur supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du demandeur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du demandeur" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}