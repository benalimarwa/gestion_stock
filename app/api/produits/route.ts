import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/produits - Retrieve all products
export async function GET() {
  try {
    const products = await prisma.produit.findMany({
      include: {
        categorie: {
          select: {
            nom: true, // Include only the category name
          },
        },
      },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des produits" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction utilitaire pour déterminer automatiquement le statut
function determineStatus(quantite:number, quantiteMinimale:number) {
  if (quantite <= 0) return "RUPTURE";
  if (quantite <= quantiteMinimale) return "CRITIQUE";
  return "NORMALE";
}

// POST /api/produits - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      nom, 
      marque, 
      quantite, 
      quantiteMinimale, 
      categorieId, 
      remarque
    } = body;
    
    // Validation des champs obligatoires
    if (!nom?.trim() || !categorieId?.trim() || !marque?.trim()) {
      return NextResponse.json(
        { error: "Nom, marque et catégorie sont obligatoires" },
        { status: 400 }
      );
    }
    
    // Validation des champs numériques
    const quantiteNumber = Number(quantite);
    if (isNaN(quantiteNumber) || quantiteNumber < 0) {
      return NextResponse.json(
        { error: "La quantité doit être un nombre valide et positif" },
        { status: 400 }
      );
    }
    
    const quantiteMinimaleNumber = Number(quantiteMinimale);
    if (isNaN(quantiteMinimaleNumber) || quantiteMinimaleNumber < 0) {
      return NextResponse.json(
        { error: "La quantité minimale doit être un nombre valide et positif" },
        { status: 400 }
      );
    }
    
    // Validation de la catégorie
    const categorieExists = await prisma.categorie.findUnique({
      where: { id: categorieId },
    });
    
    if (!categorieExists) {
      return NextResponse.json(
        { error: "Catégorie introuvable" },
        { status: 404 }
      );
    }
    
    // Déterminer automatiquement le statut
    const statut = determineStatus(quantiteNumber, quantiteMinimaleNumber);
    
    // Création du produit
    const newProduct = await prisma.produit.create({
      data: {
        nom: nom.trim(),
        marque: marque.trim(),
        quantite: Math.floor(quantiteNumber),
        quantiteMinimale: Math.floor(quantiteMinimaleNumber),
        categorieId,
        remarque: remarque || undefined,
        statut,
      },
      include: {
        categorie: {
          select: { nom: true },
        },
      },
    });
    
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error("Erreur détaillée:", error);
    return NextResponse.json(
      {
        error: "Erreur technique lors de la création",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT /api/produits - Update a product
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "L'ID du produit est requis" },
        { status: 400 }
      );
    }
    
    const product = await prisma.produit.findUnique({
      where: { id },
    });
    
    if (!product) {
      return NextResponse.json(
        { error: "Produit non trouvé" },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { 
      nom, 
      marque, 
      quantite, 
      quantiteMinimale, 
      categorieId, 
      remarque
    } = body;
    
    // Validation des champs obligatoires
    if (!nom?.trim() || !categorieId?.trim() || !marque?.trim()) {
      return NextResponse.json(
        { error: "Nom, marque et catégorie sont obligatoires" },
        { status: 400 }
      );
    }
    
    // Validation des champs numériques
    const quantiteNumber = Number(quantite);
    if (isNaN(quantiteNumber) || quantiteNumber < 0) {
      return NextResponse.json(
        { error: "La quantité doit être un nombre valide et positif" },
        { status: 400 }
      );
    }
    
    const quantiteMinimaleNumber = Number(quantiteMinimale);
    if (isNaN(quantiteMinimaleNumber) || quantiteMinimaleNumber < 0) {
      return NextResponse.json(
        { error: "La quantité minimale doit être un nombre valide et positif" },
        { status: 400 }
      );
    }
    
    // Validation de la catégorie
    const categorieExists = await prisma.categorie.findUnique({
      where: { id: categorieId },
    });
    
    if (!categorieExists) {
      return NextResponse.json(
        { error: "Catégorie introuvable" },
        { status: 404 }
      );
    }
    
    // Déterminer automatiquement le statut
    const statut = determineStatus(quantiteNumber, quantiteMinimaleNumber);
    
    // Mise à jour du produit
    const updatedProduct = await prisma.produit.update({
      where: { id },
      data: {
        nom: nom.trim(),
        marque: marque.trim(),
        quantite: Math.floor(quantiteNumber),
        quantiteMinimale: Math.floor(quantiteMinimaleNumber),
        categorieId,
        remarque: remarque || undefined,
        statut,
      },
      include: {
        categorie: {
          select: { nom: true },
        },
      },
    });
    
    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Erreur détaillée:", error);
    return NextResponse.json(
      {
        error: "Erreur technique lors de la mise à jour",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE /api/produits - Delete a product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "L'ID du produit est requis" },
        { status: 400 }
      );
    }
    
    const product = await prisma.produit.findUnique({
      where: { id },
    });
    
    if (!product) {
      return NextResponse.json(
        { error: "Produit non trouvé" },
        { status: 404 }
      );
    }
    
    await prisma.produit.delete({
      where: { id },
    });
    
    return NextResponse.json({ message: "Produit supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du produit:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la suppression du produit",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}