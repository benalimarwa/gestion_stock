import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { name, marque } = await req.json();

    if (!name || !marque) {
      return NextResponse.json({ error: "Nom et marque du produit requis" }, { status: 400 });
    }

    // Convertir le nom et la marque du nouveau produit en majuscule
    const formattedProduct = {
      name: name.toUpperCase(),
      marque: marque.toUpperCase(),
    };

    // Récupérer tous les produits de la table produit et convertir leurs nom et marque en majuscule pour la comparaison
    const regularProducts = await prisma.produit.findMany({
      select: {
        nom: true,
        marque: true,
      },
    });

    // Vérifier si le produit existe dans la table produit
    const existingRegularProduct = regularProducts.find(
      (p) => p.nom.toUpperCase() === formattedProduct.name && p.marque.toUpperCase() === formattedProduct.marque
    );

    if (existingRegularProduct) {
      return NextResponse.json(
        {
          error: `Le produit ${formattedProduct.name} (${formattedProduct.marque}) existe déjà dans la table produit`,
        },
        { status: 400 }
      );
    }

   

    // Ajouter le nouveau produit exceptionnel
    const newProduct = await prisma.produitExceptionnel.create({
      data: formattedProduct,
    });

    return NextResponse.json({
      message: "Produit exceptionnel ajouté avec succès",
      product: newProduct,
    });

  } catch (error: any) {
    console.error("Erreur lors de la vérification du produit exceptionnel:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la vérification du produit", details: error.message },
      { status: 500 }
    );
  }
}