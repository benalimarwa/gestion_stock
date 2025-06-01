import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatutDemandeExceptionnelle } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Await the params in Next.js 15
  const { id } = await params;

  console.log(`Received PATCH request to accept exceptional request ${id}`);
  try {
    const request = await prisma.demandeExceptionnelle.findUnique({
      where: { id },
      include: {
        produitsExceptionnels: {
          include: {
            produitExceptionnel: true,
          },
        },
      },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Demande exceptionnelle non trouvée" },
        { status: 404 }
      );
    }

    if (request.statut !== StatutDemandeExceptionnelle.EN_ATTENTE) {
      return NextResponse.json(
        { error: "La demande n'est pas en attente" },
        { status: 400 }
      );
    }

    const updatedRequest = await prisma.demandeExceptionnelle.update({
      where: { id },
      data: {
        statut: StatutDemandeExceptionnelle.ACCEPTEE,
        dateApprouvee: new Date(),
      },
      include: {
        produitsExceptionnels: {
          include: {
            produitExceptionnel: true,
          },
        },
      },
    });

    return NextResponse.json(updatedRequest, { status: 200 });
  } catch (error) {
    console.error("Error accepting exceptional request:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'acceptation de la demande" },
      { status: 500 }
    );
  }
}