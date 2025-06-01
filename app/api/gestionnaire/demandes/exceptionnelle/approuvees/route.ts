import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatutDemandeExceptionnelle } from "@prisma/client";

export async function GET(req: Request) {
  console.log(`Received GET request to ${req.url}`);
  try {
    const approvedRequests = await prisma.demandeExceptionnelle.findMany({
      where: {
        statut: {
          in: [StatutDemandeExceptionnelle.ACCEPTEE],
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

    return NextResponse.json(approvedRequests, { status: 200 });
  } catch (error) {
    console.error("Error fetching approved exceptional requests:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des demandes exceptionnelles approuvées" },
      { status: 500 }
    );
  }
}