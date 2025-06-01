import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db"; // Use your existing prisma import
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const categories = await prisma.categorie.findMany({
      select: {
        id: true,
        nom: true,
        _count: {
          select: {
            produits: true
          }
        }
      },
      orderBy: {
        nom: 'asc'
      }
    });

    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error("Erreur dans GET /api/magasinier/categories:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des catégories" },
      { status: 500 }
    );
  }
}