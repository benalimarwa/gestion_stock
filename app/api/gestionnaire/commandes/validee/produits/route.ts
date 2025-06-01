// /app/api/gestionnaire/produits/route.ts
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
    
    // Get all products
    const products = await prisma.produit.findMany({
      include: {
        categorie: true
      },
      orderBy: {
        nom: "asc"
      }
    });
    
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}