import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Get all products with their categories
    const produits = await prisma.produit.findMany({
      include: {
        categorie: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(produits);
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des produits" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Validate required fields
    if (!data.nom?.trim()) {
      return NextResponse.json({ error: "Le nom du produit est requis." }, { status: 400 });
    }
    if (!data.marque?.trim()) {
      return NextResponse.json({ error: "La marque du produit est requise." }, { status: 400 });
    }
    if (!data.categorieId) {
      return NextResponse.json({ error: "L'ID de la catégorie est requis." }, { status: 400 });
    }
    if (!["DURABLE", "CONSOMMABLE"].includes(data.critere)) {
      return NextResponse.json({ error: "Critère invalide. Doit être DURABLE ou CONSOMMABLE." }, { status: 400 });
    }
    if (!["NORMALE", "CRITIQUE", "RUPTURE"].includes(data.statut)) {
      return NextResponse.json({ error: "Statut invalide. Doit être NORMALE, CRITIQUE ou RUPTURE." }, { status: 400 });
    }
    if (typeof data.quantite !== "number" || data.quantite < 0) {
      return NextResponse.json({ error: "Quantité invalide. Doit être un nombre positif." }, { status: 400 });
    }
    if (typeof data.quantiteMinimale !== "number" || data.quantiteMinimale < 0) {
      return NextResponse.json({ error: "Quantité minimale invalide. Doit être un nombre positif." }, { status: 400 });
    }

    // Check if category exists
    const category = await prisma.categorie.findUnique({
      where: { id: data.categorieId },
    });
    if (!category) {
      return NextResponse.json({ error: "Catégorie non trouvée." }, { status: 400 });
    }

    const product = await prisma.produit.create({
      data: {
        nom: data.nom.trim(),
        marque: data.marque.trim(),
        quantite: data.quantite,
        quantiteMinimale: data.quantiteMinimale,
        statut: data.statut,
        critere: data.critere,
        remarque: data.remarque?.trim() || null,
        categorieId: data.categorieId,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error("Erreur lors de la création du produit:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Un produit avec ce nom et cette marque existe déjà." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Erreur serveur: ${error.message || "Erreur inconnue"}` },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
