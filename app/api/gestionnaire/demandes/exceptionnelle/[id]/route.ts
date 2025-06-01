import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatutDemandeExceptionnelle } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string } >}) {
  const { id } =await params;

  console.log(`Received PATCH request to mark exceptional request ${id} as ordered`);
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

    if (request.statut !== StatutDemandeExceptionnelle.ACCEPTEE) {
      return NextResponse.json(
        { error: "La demande n'est pas approuvée" },
        { status: 400 }
      );
    }

    const updatedRequest = await prisma.demandeExceptionnelle.update({
      where: { id },
      data: {
        statut: StatutDemandeExceptionnelle.COMMANDEE,
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
    console.error("Error marking exceptional request as ordered:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la demande" },
      { status: 500 }
    );
  }
}