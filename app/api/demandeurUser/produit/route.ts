import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Produit, Categorie } from "@prisma/client";

export async function GET() {
  try {
    console.log("Fetching products from database");
    
    // Fetch products
    const products = await prisma.produit.findMany({
      select: {
        id: true,
        nom: true,
        marque: true,
        quantite: true,
        categorie: {
          select: {
            nom: true,
          },
        },
      },
    });
    
    // Format response - let TypeScript infer the type
    const formattedProducts = products.map((product) => ({
      id: product.id,
      nom: product.nom || "N/A",
      marque: product.marque || "Inconnu",
      quantite: product.quantite ?? 0,
      categorie: product.categorie ? { nom: product.categorie.nom || "N/A" } : { nom: "N/A" },
    }));
    
    console.log("Products fetched successfully:", formattedProducts.length);
    return NextResponse.json(formattedProducts);
  } catch (error: any) {
    console.error("Erreur lors de la récupération des produits:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des produits", details: error.message },
      { status: 500 }
    );
  }
}