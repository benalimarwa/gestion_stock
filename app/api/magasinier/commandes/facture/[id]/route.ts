// app/api/magasinier/commandes/facture/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log("Recherche de la facture pour la commande ID:", id);

    // Vérifier d'abord si la commande existe
    const commande = await prisma.commande.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        facture: true,
        statut: true,
      },
    });

    console.log("Commande trouvée:", commande);

    if (!commande) {
      console.log("Commande non trouvée avec l'ID:", id);
      return NextResponse.json(
        { error: "Commande non trouvée" },
        { status: 404 }
      );
    }

    if (!commande.facture) {
      console.log("Facture non disponible pour la commande:", id);
      return NextResponse.json(
        { error: "Facture non disponible pour cette commande" },
        { status: 404 }
      );
    }

    console.log("Facture trouvée:", commande.facture);

    // Vérifier si le chemin de la facture est valide
    // Vous pouvez ajouter une validation supplémentaire ici
    if (typeof commande.facture !== 'string' || commande.facture.trim() === '') {
      return NextResponse.json(
        { error: "Chemin de facture invalide" },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      facturePath: commande.facture,
      commandeId: commande.id 
    });

  } catch (error) {
    console.error("Erreur lors de la récupération de la facture:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}