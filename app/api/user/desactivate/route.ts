import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

interface ClerkError extends Error {
  errors?: { message: string; code?: string }[];
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      console.log("No userId provided");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { status } = body;
    if (!status || (status !== "DEACTIVATED" && status !== "ACTIVE")) {
      console.log("Invalid or missing status in request body:", body);
      return NextResponse.json({ error: "Statut invalide ou manquant" }, { status: 400 });
    }

    // Find user in Prisma
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user) {
      console.log(`User not found for clerkUserId: ${userId}`);
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Check if user is already in the desired state
    if (user.status === status) {
      console.log(`User already ${status}`);
      return NextResponse.json(
        { error: `Utilisateur déjà ${status === "DEACTIVATED" ? "désactivé" : "actif"}` },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: {
      status: "ACTIVE" | "DEACTIVATED";
      role?: "UNDEFINED" | "ADMIN" | "DEMANDEUR" | "GESTIONNAIRE" | "MAGASINNIER";
      previousRole?: "UNDEFINED" | "ADMIN" | "DEMANDEUR" | "GESTIONNAIRE" | "MAGASINNIER" | null;
    } = { status };

    if (status === "DEACTIVATED") {
      updateData.role = "UNDEFINED";
      updateData.previousRole = user.role;
    } else if (status === "ACTIVE") {
      updateData.role = user.previousRole || "UNDEFINED";
      updateData.previousRole = null;
    }

    console.log(`Updating user ${userId} to status: ${status}, role: ${updateData.role}`);
    const updatedUser = await prisma.user.update({
      where: { clerkUserId: userId },
      data: updateData,
    });

    // Log to registry (consistent with ProductsDataTable)
    

    // Update Clerk user metadata
    if (user.clerkUserId && process.env.CLERK_SECRET_KEY) {
      try {
        console.log(`Updating Clerk metadata for user: ${user.clerkUserId}`);
        await clerk.users.updateUser(userId, {
          publicMetadata: {
            status,
            role: updateData.role,
          },
        });
        console.log("Clerk user metadata updated successfully");
      } catch (clerkError: any) {
        console.error("Clerk metadata update failed:", clerkError);
      }
    
    }

    return NextResponse.json(
      { message: `Utilisateur ${status === "DEACTIVATED" ? "désactivé" : "réactivé"} avec succès` },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error in PATCH /api/user/deactivate:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { error: `Erreur lors de la ${status === "DEACTIVATED" ? "désactivation" : "réactivation"} de l'utilisateur`, details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}