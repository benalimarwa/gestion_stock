import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { stat } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log("Recherche de la facture pour la commande ID:", id);

    // Fetch commande
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

    // Validate file exists
    const filePath = path.join(process.cwd(), "public", commande.facture);
    try {
      await stat(filePath);
    } catch (err) {
      console.error("Facture fichier non trouvé sur le disque:", filePath);
      return NextResponse.json(
        { error: "Fichier de la facture non trouvé sur le serveur" },
        { status: 404 }
      );
    }

    // Construct the public URL
    const factureUrl = `/public${commande.facture}`;
    console.log("URL de la facture:", factureUrl);

    return NextResponse.json({
      facturePath: factureUrl,
      commandeId: commande.id,
    });

  } catch (error) {
    console.error("Erreur lors de la récupération de la facture:", error);
    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}