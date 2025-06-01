import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export async function GET() {
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
    if (dbUser.role !== "ADMIN" && dbUser.role !== "GESTIONNAIRE" && dbUser.role !== "MAGASINNIER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // Get all validated orders
    const validatedOrders = await prisma.commande.findMany({
      where: {
        statut: "VALIDE"
      },
      include: {
        produits: {
          include: {
            produit: {
              select: {
                id: true,
                nom: true,
                marque: true
              }
            }
          }
        },
        fournisseur: {
          select: {
            id: true,
            nom: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    
    return NextResponse.json(validatedOrders);
  } catch (error) {
    console.error("Error fetching validated orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch validated orders" },
      { status: 500 }
    );
  }
}