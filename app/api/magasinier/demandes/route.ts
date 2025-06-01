// app/api/magasinier/demandes/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    console.log("Utilisateur Clerk:", {
      id: user?.id,
      email: user?.emailAddresses[0]?.emailAddress,
      role: user?.publicMetadata?.role,
    });

    if (!user) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const demandes = await prisma.demande.findMany({
      where: {
        statut: {
          in: ["APPROUVEE", "PRISE"],
        },
      },
      include: {
        demandeur: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        produits: {
          include: {
            produit: true,
          },
        },
      },
      orderBy: {
        dateApprouvee: "desc",
      },
    });

    return NextResponse.json(demandes);
  } catch (error: any) {
    console.error("Erreur détaillée lors de la récupération des demandes:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      { message: "Une erreur est survenue lors de la récupération des demandes", details: error.message },
      { status: 500 }
    );
  }
}