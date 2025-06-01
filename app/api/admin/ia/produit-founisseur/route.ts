// app/api/admin/produit-fournisseur/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { produitId, fournisseurId } = await request.json();

    const relation = await prisma.produitFournisseur.create({
      data: {
        produitId,
        fournisseurId,
      },
    });

    return NextResponse.json(relation, { status: 201 });
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}