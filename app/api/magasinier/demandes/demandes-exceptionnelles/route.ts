import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const demandes = await prisma.demandeExceptionnelle.findMany({
      where: {
        statut: {
          in: ["ACCEPTEE", "COMMANDEE", "LIVREE"],
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
        produitsExceptionnels: {
          include: {
            produitExceptionnel: true,
          },
        },
      },
      orderBy: {
        dateApprouvee: "desc",
      },
    });

    return NextResponse.json(demandes);
  } catch (error: any) {
    console.error("Erreur détaillée lors de la récupération des demandes exceptionnelles:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      { message: "Une erreur est survenue lors de la récupération des demandes exceptionnelles", details: error.message },
      { status: 500 }
    );
  }
}