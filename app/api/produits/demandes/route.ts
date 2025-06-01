import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const produitId = searchParams.get("produitId");
    const statut = searchParams.get("statut");
    
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
    
    // Trouver toutes les demandes avec ce produit et le statut spécifié (si fourni)
    const demandesProduit = await prisma.demandeProduit.findMany({
      where: {
        produitId,
        demande: statut ? { statut: statut as any } : undefined
      },
      include: {
        demande: {
          include: {
            demandeur: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    
    // Dans api/produits/demandes/route.ts, modifiez le return comme suit :
const demandesFormattees = demandesProduit.map(dp => ({
  id: dp.id,
  demandeur: dp.demande.demandeur,
  dateApprouvee: dp.demande.dateApprouvee || null,
  quantite: dp.quantite
}));

return NextResponse.json(demandesFormattees);
  } catch (error) {
    console.error("Erreur lors de la récupération des demandes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des demandes" },
      { status: 500 }
    );
  }
}