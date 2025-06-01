import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    
    

    

    const produits = await prisma.produit.findMany({
      select: {
        id: true,
        nom: true,
        quantite: true,
        marque: true,
        categorie: {
          select: {
            nom: true,
          },
        },
      },
      orderBy: {
        nom: "asc",
      },
    });

    console.log("Products fetched:", produits.length);
    return NextResponse.json(produits);
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