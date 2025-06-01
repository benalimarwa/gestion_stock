// app/api/demandeurUser/produit/demande/route.ts
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const demandeur = await prisma.demandeur.findUnique({
      where: { userId: dbUser.id },
    });
    if (!demandeur) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { produitId, quantite } = await request.json();
    if (!produitId || quantite <= 0) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const product = await prisma.produit.findUnique({
      where: { id: produitId },
    });
    if (!product || product.quantite < quantite) {
      return NextResponse.json(
        { error: "Produit indisponible ou quantité insuffisante" },
        { status: 400 }
      );
    }

    const demande = await prisma.demande.create({
      data: {
        demandeurId: demandeur.id,
        statut: "EN_ATTENTE",
        produits: {
          create: [{ produitId, quantite }],
        },
      },
    });

    return NextResponse.json({ message: "Demande créée", demande });
  } catch (error: any) {
    console.error("Erreur lors de la création de la demande:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}