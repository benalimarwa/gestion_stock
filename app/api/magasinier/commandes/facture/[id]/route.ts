// app/api/magasinier/commandes/facture/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {id:id} = await params;
    
    const commande = await prisma.commande.findUnique({
      where: {
        id: id,
      },
      select: {
        facture: true,
      },
    });

    if (!commande || !commande.facture) {
      return NextResponse.json(
        { error: "Facture non trouvée" },
        { status: 404 }
      );
    }

    // Si vous stockez le chemin du fichier dans la base de données
    return NextResponse.json({ facturePath: commande.facture });
    
  } catch (error) {
    console.error("Erreur lors de la récupération de la facture:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la facture" },
      { status: 500 }
    );
  }
}