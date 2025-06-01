import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, nom, contact } = body;

    if (!id || !nom || !contact) {
      return NextResponse.json(
        { error: "ID, nom et contact sont requis" },
        { status: 400 }
      );
    }

    const existingFournisseur = await prisma.fournisseur.findUnique({
      where: { id },
    });

    if (!existingFournisseur) {
      return NextResponse.json(
        { error: "Fournisseur non trouvé" },
        { status: 404 }
      );
    }

    const updatedFournisseur = await prisma.fournisseur.update({
      where: { id },
      data: {
        nom,
        contact,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedFournisseur, { status: 200 });
  } catch (error) {
    console.error("Erreur PUT /api/admin/fourdetail:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du fournisseur" },
      { status: 500 }
    );
  }
}