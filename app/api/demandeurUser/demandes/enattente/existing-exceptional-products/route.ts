import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { products } = await req.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Aucun produit fourni" }, { status: 400 });
    }

    // Convertir les noms et marques des produits envoyés en majuscule
    const formattedProducts = products.map((product: { name: string; marque: string }) => ({
      name: product.name.toUpperCase(),
      marque: product.marque.toUpperCase(),
    }));

    // Récupérer tous les produits de la table produit et convertir leurs nom et marque en majuscule pour la comparaison
    const regularProducts = await prisma.produit.findMany({
      select: {
        nom: true,
        marque: true,
      },
    });

    // Vérifier si les produits existent dans la table produit
    const existingRegularProducts = regularProducts.filter((p) =>
      formattedProducts.some(
        (fp: { name: string; marque: string }) =>
          p.nom.toUpperCase() === fp.name && (p.marque || "").toUpperCase() === fp.marque
      )
    );

    if (existingRegularProducts.length > 0) {
      return NextResponse.json(existingRegularProducts, { status: 200 });
    }

    // Vérifier si les produits existent dans la table produitExceptionnel
    const existingExceptionalProducts = await prisma.produitExceptionnel.findMany({
      where: {
        OR: formattedProducts.map((p: { name: string; marque: string }) => ({
          name: p.name,
          marque: p.marque,
        })),
      },
      select: {
        name: true,
        marque: true,
      },
    });

    return NextResponse.json(existingExceptionalProducts, { status: 200 });

  } catch (error: any) {
    console.error("Erreur lors de la vérification des produits existants:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la vérification des produits", details: error.message },
      { status: 500 }
    );
  }
}