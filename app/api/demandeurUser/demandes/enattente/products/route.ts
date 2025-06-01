import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      console.error("No authenticated user found");
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
    });

    if (!dbUser) {
      console.error("User not found:", user.id);
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    if (dbUser.role !== Role.DEMANDEUR) {
      console.error("User does not have DEMANDEUR role:", dbUser.id);
      return NextResponse.json(
        { error: "Accès non autorisé. Vous devez être un demandeur." },
        { status: 403 }
      );
    }

    const demandeur = await prisma.demandeur.findUnique({
      where: { userId: dbUser.id },
    });

    if (!demandeur) {
      console.error("No Demandeur record found for user:", dbUser.id);
      return NextResponse.json(
        { error: "Aucun profil demandeur associé à cet utilisateur" },
        { status: 404 }
      );
    }

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