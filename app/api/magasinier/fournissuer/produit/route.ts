import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const {
      nom,
      marque,
      quantite,
      quantiteMinimale,
      categorieId,
      remarque,
      statut,
      critere,
    } = await request.json();

    // Validation
    if (!nom || quantite < 0 || !categorieId || !critere) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants (nom, quantité, catégorie, critère)" },
        { status: 400 }
      );
    }

    if (quantiteMinimale < 0) {
      return NextResponse.json(
        { error: "La quantité minimale ne peut pas être négative" },
        { status: 400 }
      );
    }

    if (!["DURABLE", "CONSOMMABLE"].includes(critere)) {
      return NextResponse.json(
        { error: "Critère invalide. Doit être 'DURABLE' ou 'CONSOMMABLE'" },
        { status: 400 }
      );
    }

    const produit = await prisma.produit.create({
      data: {
        nom,
        marque: marque || "Inconnu",
        quantite,
        quantiteMinimale: quantiteMinimale || 0,
        categorieId,
        remarque: remarque || null,
        statut: statut || "NORMALE",
        critere: critere || "DURABLE",
      },
      include: { categorie: { select: { nom: true } } },
    });

    return NextResponse.json(produit, { status: 201 });
  } catch (error) {
    console.error("Erreur dans POST /api/magasinier/fournisseur/produit:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  try {
    const produits = await prisma.produit.findMany({
      include: { categorie: { select: { nom: true } } },
    });
    return NextResponse.json(produits, { status: 200 });
  } catch (error) {
    console.error("Erreur dans GET /api/magasinier/fournisseur/produit:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    await prisma.produit.delete({ where: { id } });
    return NextResponse.json({ message: "Produit supprimé" }, { status: 200 });
  } catch (error) {
    console.error("Erreur dans DELETE /api/magasinier/fournisseur/produit:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}