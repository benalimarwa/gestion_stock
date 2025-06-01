import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(req: Request, { params }: { params:Promise< { id: string }> }) {
  const { id } = await params;

  console.log(`Received GET request for exceptional request ${id}`);
  try {
    const request = await prisma.demandeExceptionnelle.findUnique({
      where: { id },
      include: {
        produitsExceptionnels: {
          include: {
            produitExceptionnel: true,
          },
        },
        demandeur: true,
        fournisseur: true,
      },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Demande exceptionnelle non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json(request, { status: 200 });
  } catch (error) {
    console.error("Error fetching exceptional request details:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des détails de la demande" },
      { status: 500 }
    );
  }
}