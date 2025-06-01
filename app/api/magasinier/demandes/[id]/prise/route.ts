import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { PrismaClient, Prisma } from "@prisma/client";

// Define types for better type safety
type LowStockProduct = {
  id: string;
  nom: string;
  marque: string | null;
  quantite: number;
  quantiteMinimale: number;
};

type RuptureProduct = {
  id: string;
  nom: string;
  marque: string | null;
  quantite: number;
};

type TransactionResult = {
  lowStockProducts: LowStockProduct[];
  ruptureProducts: RuptureProduct[];
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let demandeId: string = ''; // Declare outside try-catch block
  
  try {
    const { id } = await params;
    demandeId = id; // Assign the value here
    const user = await currentUser();

    // Vérifications d'authentification
    if (!user) {
      console.error("Unauthorized access attempt: No user authenticated");
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      );
    }

    // Récupérer la demande avec ses produits
    console.log("Fetching demand with ID:", demandeId);
    const demande = await prisma.demande.findUnique({
      where: {
        id: demandeId,
        statut: "APPROUVEE",
      },
      include: {
        demandeur: true,
        produits: {
          include: {
            produit: true,
          },
        },
      },
    });

    if (!demande) {
      console.error("Demand not found or already processed:", demandeId);
      return NextResponse.json(
        { message: "Demande non trouvée ou déjà traitée" },
        { status: 404 }
      );
    }

    // Vérifier les stocks avant de procéder
    for (const demandeProduit of demande.produits) {
      if (demandeProduit.produit.quantite < demandeProduit.quantite) {
        console.error("Insufficient stock for product:", {
          produitId: demandeProduit.produit.id,
          nom: demandeProduit.produit.nom,
          available: demandeProduit.produit.quantite,
          requested: demandeProduit.quantite,
        });
        return NextResponse.json(
          {
            message: `Stock insuffisant pour ${demandeProduit.produit.nom}. Disponible: ${demandeProduit.produit.quantite}, Demandé: ${demandeProduit.quantite}`,
          },
          { status: 400 }
        );
      }
    }

    // Utiliser une transaction pour garantir l'intégrité des données
    const result = await prisma.$transaction(async (prismaClient: Prisma.TransactionClient): Promise<TransactionResult> => {
      // 1. Mettre à jour le statut de la demande
      console.log("Updating demand status to PRISE:", demandeId);
      await prismaClient.demande.update({
        where: { id: demandeId },
        data: { statut: "PRISE" },
      });

      // 2. Mettre à jour les stocks et détecter les alertes
      const lowStockProducts: LowStockProduct[] = [];
      const ruptureProducts: RuptureProduct[] = [];

      for (const demandeProduit of demande.produits) {
        const produit = demandeProduit.produit;
        const newQuantity = produit.quantite - demandeProduit.quantite;

        console.log(`Updating ${produit.nom}: Old quantity ${produit.quantite}, Requested ${demandeProduit.quantite}, New quantity ${newQuantity}`);

        // Mettre à jour la quantité et le statut
        await prismaClient.produit.update({
          where: { id: produit.id },
          data: {
            quantite: newQuantity,
            statut: newQuantity <= 0
              ? "RUPTURE"
              : newQuantity <= (produit.quantiteMinimale || 0) // Fallback si quantiteMinimale est absent
              ? "CRITIQUE"
              : "NORMALE",
          },
        });

        // Détecter rupture (quantité <= 0)
        if (newQuantity <= 0) {
          ruptureProducts.push({
            id: produit.id,
            nom: produit.nom,
            marque: produit.marque,
            quantite: newQuantity,
          });
        }
        // Détecter stock critique (quantité <= quantiteMinimale)
        else if (newQuantity <= (produit.quantiteMinimale || 0)) {
          lowStockProducts.push({
            id: produit.id,
            nom: produit.nom,
            marque: produit.marque,
            quantite: newQuantity,
            quantiteMinimale: produit.quantiteMinimale || 0,
          });
        }
      }

      // 3. Créer une notification pour le demandeur si possible
      try {
        const demandeurData = await prismaClient.demandeur.findUnique({
          where: { id: demande.demandeurId },
          select: { userId: true },
        });

        if (demandeurData?.userId) {
          await prismaClient.notification.create({
            data: {
              userId: demandeurData.userId,
              message: `Votre demande (ID: ${demandeId.substring(0, 8)}...) a été traitée et les articles sont disponibles pour récupération.`,
              typeEnvoi: "SYSTEM",
            },
          });
          console.log("Created notification for demandeur:", demandeurData.userId);
        }
      } catch (notifError) {
        console.error("Erreur lors de la création de la notification:", {
          error: notifError instanceof Error ? notifError.message : "Unknown error",
          stack: notifError instanceof Error ? notifError.stack : undefined,
        });
        // Continuez même si la notification échoue
      }

      return { lowStockProducts, ruptureProducts };
    });

    return NextResponse.json({
      success: true,
      message: "Demande traitée avec succès",
    });

  } catch (error) {
    console.error("Erreur lors du traitement de la demande:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      demandeId: demandeId, // Now accessible here
    });
    return NextResponse.json(
      {
        message: "Une erreur est survenue lors du traitement de la demande",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}