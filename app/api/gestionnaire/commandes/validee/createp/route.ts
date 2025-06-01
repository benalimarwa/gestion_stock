// /app/api/gestionnaire/commandes/validee/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Find the user in our database
    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
    });
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Check if user is an admin or gestionnaire
    if (dbUser.role !== "ADMIN" && dbUser.role !== "MAGASINNIER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const { fournisseurId, produits, sourceOrderId } = body;
    
    if (!fournisseurId || !produits || !Array.isArray(produits) || produits.length === 0) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    
    // Create new order (with EN_COURS status)
    const commande = await prisma.commande.create({
      data: {
        date: new Date(), // Add the required date field
        fournisseur: {
          connect: { id: fournisseurId }
        },
        statut: "EN_COURS",
        produits: {
          create: produits.map((item: { produitId: string; quantite: number }) => ({
            produitId: item.produitId,
            quantite: item.quantite
          }))
        }
      },
      include: {
        produits: {
          include: {
            produit: true
          }
        },
        fournisseur: true // Include fournisseur in the response
      }
    });
    
    // Mark products as reordered in the source order
    if (sourceOrderId) {
      const productIds = produits.map((p: any) => p.produitId);
      
      await prisma.commandeProduit.updateMany({
        where: {
          commandeId: sourceOrderId,
          produitId: { in: productIds }
        },
        data: {
          reordered: true
        }
      });
    }
    
    // Create notification for admin
    await prisma.notification.create({
      data: {
        userId: dbUser.id,
        message: `New order created for supplier ID: ${fournisseurId}`,
        typeEnvoi: "SYSTEM"
      }
    });
    
    return NextResponse.json(commande);
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}