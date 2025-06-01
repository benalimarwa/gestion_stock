import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import db from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { StatutProduit } from "@prisma/client"; // Import the enum

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const { id: productId } = await params;
    const data = await req.json();
    
    // Verify the product exists
    const existingProduct = await prisma.produit.findUnique({
      where: { id: productId }
    });
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: "Produit non trouvé" },
        { status: 404 }
      );
    }
    
    // Détermination automatique du statut basée sur les quantités
    let statut: StatutProduit = StatutProduit.NORMALE; // Use enum
    const quantite = parseInt(data.quantite);
    const quantiteMinimale = parseInt(data.quantiteMinimale);
    
    if (quantite <= 0) {
      statut = StatutProduit.RUPTURE;
    } else if (quantite <= quantiteMinimale) {
      statut = StatutProduit.CRITIQUE;
    }
    
    // Update the product with the computed status in a single operation
    const updatedProduct = await prisma.produit.update({
      where: { id: productId },
      data: {
        nom: data.nom,
        marque: data.marque,
        quantite: quantite,
        quantiteMinimale: quantiteMinimale,
        statut: statut, // Now properly typed
        critere: data.critere,
        remarque: data.remarque || null
      },
      include: {
        categorie: true
      }
    });
    
    // Send email alert if quantite equals quantiteMinimale and statut is CRITIQUE
    if (quantite === quantiteMinimale && updatedProduct.statut === StatutProduit.CRITIQUE) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const emailResponse = await fetch(`${baseUrl}/api/emails/send-to-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: updatedProduct.id,
          productName: updatedProduct.nom,
          marque: updatedProduct.marque,
          quantite: updatedProduct.quantite,
          quantiteMinimale: updatedProduct.quantiteMinimale,
          statut: updatedProduct.statut,
        }),
      });

      const emailContentType = emailResponse.headers.get("content-type");
      if (!emailContentType || !emailContentType.includes("application/json")) {
        const emailResponseText = await emailResponse.text();
        console.error("Non-JSON email API response:", {
          status: emailResponse.status,
          statusText: emailResponse.statusText,
          contentType: emailContentType,
          responseText: emailResponseText.slice(0, 1000),
        });
      } else {
        const emailData = await emailResponse.json();
        if (!emailResponse.ok) {
          console.error("Erreur lors de l'envoi de l'email d'alerte:", emailData);
        } else {
          console.log("Email d'alerte envoyé avec succès:", emailData);
        }
      }
    }

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du produit:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du produit" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const { id: productId } = await params;
    const product = await prisma.produit.findUnique({
      where: { id: productId },
      include: {
        categorie: true
      }
    });
    
    if (!product) {
      return NextResponse.json(
        { error: "Produit non trouvé" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(product);
  } catch (error) {
    console.error("Erreur lors de la récupération du produit:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du produit" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID du produit requis" }, { status: 400 });
    }

    // Vérifier si le produit existe
    const produit = await prisma.produit.findUnique({ where: { id } });
    if (!produit) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    // Vérifier s'il existe des commandes associées
    const hasOrders = await prisma.commandeProduit.findFirst({
      where: { produitId: id },
    });

    // Vérifier s'il existe des demandes associées
    const hasDemands = await prisma.demandeProduit.findFirst({
      where: { produitId: id },
    });

    // Si des commandes ou des demandes existent, empêcher la suppression
    if (hasOrders || hasDemands) {
      return NextResponse.json(
        { error: "Impossible de supprimer ce produit car il est associé à des commandes ou demandes" },
        { status: 400 }
      );
    }

    // Supprimer les relations associées et le produit dans une transaction
    await prisma.$transaction([
      prisma.alerte.deleteMany({ where: { produitId: id } }),
      prisma.produitFournisseur.deleteMany({ where: { produitId: id } }),
      prisma.registreProduit.deleteMany({ where: { produitId: id } }),
      prisma.produit.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: "Produit supprimé avec succès" }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Erreur DELETE /api/magasinier/produits/[id]:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Erreur lors de la suppression du produit", details: errorMessage },
      { status: 500 }
    );
  }
}