// app/api/magasinier/commandes/commandes-en-retour/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// Define the type for command products with included product data
type CommandeWithProducts = {
  id: string;
  statut: string;
  produits: {
    produitId: string;
    quantite: number;
    produit: {
      id: string;
      // Add other product properties as needed
    };
  }[];
  // Add other commande properties as needed
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const { statut } = body;

    // Vérifier que la commande existe et est actuellement en retour
    const commande = await prisma.commande.findUnique({
      where: {
        id: orderId,
        statut: "EN_RETOUR",
      },
      include: {
        produits: {
          include: {
            produit: true,
          },
        },
      },
    }) as CommandeWithProducts | null;

    if (!commande) {
      return NextResponse.json(
        { error: "Commande non trouvée ou n'est pas en retour" },
        { status: 404 }
      );
    }

    // Mettre à jour tous les produits en augmentant leur quantité
    const updateProductsPromises = commande.produits.map((item: { produitId: string; quantite: number }) => {
      return prisma.produit.update({
        where: { id: item.produitId },
        data: {
          quantite: {
            increment: item.quantite, // Augmenter la quantité en stock
          },
        },
      });
    });

    // Mettre à jour le statut de la commande et définir la date de livraison
    const updateOrderPromise = prisma.commande.update({
      where: { id: orderId },
      data: {
        statut: "LIVREE",
        dateLivraison: new Date(), // Définir la date de livraison comme la date actuelle
      },
    });

    // Exécuter toutes les mises à jour dans une transaction
    const [updatedOrder, ...updatedProducts] = await prisma.$transaction([
      updateOrderPromise,
      ...updateProductsPromises,
    ]);

    return NextResponse.json(
      {
        message: "Commande mise à jour avec succès",
        commande: updatedOrder,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la commande:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la commande" },
      { status: 500 }
    );
  }
}