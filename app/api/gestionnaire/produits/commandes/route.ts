// /app/api/commandes/produit/route.ts
import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const produitId = searchParams.get("produitId");
    const statut = searchParams.get("statut") || "LIVREE"; // Par défaut, on cherche les commandes livrées
    
    if (!produitId) {
      return NextResponse.json(
        { error: "L'ID du produit est requis" },
        { status: 400 }
      );
    }

    // Validation que le produit existe
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
    });
    
    if (!produit) {
      return NextResponse.json(
        { error: "Produit non trouvé" },
        { status: 404 }
      );
    }

    // Trouver toutes les commandes avec ce produit et le statut spécifié
    const commandesProduit = await prisma.commandeProduit.findMany({
      where: {
        produitId,
        commande: { 
          statut: statut as any 
        }
      },
      include: {
        commande: {
          include: {
            fournisseur: {
              select: {
                nom: true,
              },
            },
          },
        },
        produit: {
          select: {
            nom: true,
          },
        },
      },
      orderBy: {
        commande: {
          dateLivraison: 'desc',
        },
      },
    });

    // Dans api/produits/commandes/route.ts, modifiez le return comme suit :
const commandesFormattees = commandesProduit.map(cp => ({
  id: cp.id,
  fournisseur: cp.commande.fournisseur,
  dateLivraison: cp.commande.dateLivraison || null,
  quantite: cp.quantite
}));

return NextResponse.json(commandesFormattees);
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes" },
      { status: 500 }
    );
  }
}