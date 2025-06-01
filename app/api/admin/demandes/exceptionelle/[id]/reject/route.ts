import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatutDemandeExceptionnelle } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string } >}) {
   const { id } = await params;

  console.log(`Received PATCH request to reject exceptional request ${id}`);
  try {
    const body = await req.json();
    const { raisonRefus } = body;

    if (!raisonRefus || typeof raisonRefus !== "string" || raisonRefus.trim() === "") {
      return NextResponse.json(
        { error: "Motif de rejet requis et doit être une chaîne non vide" },
        { status: 400 }
      );
    }

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
        statut: StatutDemandeExceptionnelle.REJETEE,
        raisonRefus: raisonRefus.trim(),
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
    console.error("Error rejecting exceptional request:", error);
    return NextResponse.json(
      { error: "Erreur lors du rejet de la demande" },
      { status: 500 }
    );
  }
}