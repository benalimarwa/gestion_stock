import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatutDemandeExceptionnelle } from "@prisma/client";

export async function GET(req: Request) {
  console.log(`Received GET request to ${req.url}`);
  try {
    const exceptionalRequests = await prisma.demandeExceptionnelle.findMany({
      where: {
        statut: {
          in: [StatutDemandeExceptionnelle.EN_ATTENTE, StatutDemandeExceptionnelle.ACCEPTEE],
        },
      },
      include: {
        produitsExceptionnels: {
          include: {
            produitExceptionnel: true,
          },
        },
      },
    });

    return NextResponse.json(exceptionalRequests, { status: 200 });
  } catch (error) {
    console.error("Error fetching exceptional requests:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des demandes exceptionnelles" },
      { status: 500 }
    );
  }
}