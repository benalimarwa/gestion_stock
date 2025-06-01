import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const nom = searchParams.get("nom");
    const marque = searchParams.get("marque");

    if (!nom || typeof nom !== "string" || nom.trim() === "") {
      return NextResponse.json(
        { error: "Le nom du produit est requis et doit être une chaîne non vide." },
        { status: 400 }
      );
    }
    if (!marque || typeof marque !== "string" || marque.trim() === "") {
      return NextResponse.json(
        { error: "La marque du produit est requise et doit être une chaîne non vide." },
        { status: 400 }
      );
    }

    const product = await prisma.produit.findFirst({
      where: {
        nom: {
          equals: nom.trim(),
          mode: "insensitive",
        },
        marque: {
          equals: marque.trim(),
          mode: "insensitive",
        },
      },
      select: { id: true, nom: true, marque: true }, // Include marque in response
    });

    return NextResponse.json(
      {
        exists: !!product,
        product: product ? { id: product.id, nom: product.nom, marque: product.marque } : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de la vérification du produit:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la vérification du produit." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}