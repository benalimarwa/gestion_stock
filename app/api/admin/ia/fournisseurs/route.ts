// app/api/admin/fournisseur/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const produitIds = url.searchParams.get("produitIds")?.split(",") || [];

    const fournisseurs = await prisma.fournisseur.findMany({
      where: produitIds.length > 0
        ? {
            produits: {
              some: {
                produitId: { in: produitIds },
              },
            },
          }
        : {},
      select: {
        id: true,
        nom: true,
        score: true,
      },
      orderBy: {
        score: "desc",
      },
    });

    return NextResponse.json(fournisseurs);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}