import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatutDemandeExceptionnelle } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string } >}) {
  const { id } =await params;

  console.log(`Received PATCH request to mark exceptional request ${id} as ordered`);
  try {
    const body = await req.json();
    const { selectedProducts, supplierId, datePrevu, newStatus } = body;

    if (!Array.isArray(selectedProducts) || selectedProducts.length === 0 || !supplierId || !datePrevu) {
      return NextResponse.json(
        { error: "Données invalides: selectedProducts, supplierId, et datePrevu requis" },
        { status: 400 }
      );
    }

    if (!newStatus || !Object.values(StatutDemandeExceptionnelle).includes(newStatus)) {
      return NextResponse.json(
        { error: "Statut invalide" },
        { status: 400 }
      );
    }

    // Validate supplier existence
    const supplier = await prisma.fournisseur.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) {
      return NextResponse.json(
        { error: `Fournisseur avec ID ${supplierId} non trouvé` },
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

    // Allow updates if the status is either ACCEPTEE or EN_ATTENTE
    if (
      request.statut !== StatutDemandeExceptionnelle.ACCEPTEE &&
      request.statut !== StatutDemandeExceptionnelle.EN_ATTENTE
    ) {
      return NextResponse.json(
        { error: "La demande ne peut pas être mise à jour dans cet état" },
        { status: 400 }
      );
    }

    // Validate datePrevu as a valid ISO date
    if (isNaN(new Date(datePrevu).getTime())) {
      return NextResponse.json(
        { error: "Date prévue invalide" },
        { status: 400 }
      );
    }

    const updatedRequest = await prisma.demandeExceptionnelle.update({
      where: { id },
      data: {
        statut: newStatus,
        fournisseurId: supplierId,
        datePrevu: new Date(datePrevu),
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