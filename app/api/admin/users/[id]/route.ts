import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

interface ClerkError extends Error {
  errors?: { message: string; code?: string }[];
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string } >}) {
  try {
    

    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      console.log("No userId, returning 401");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Verify admin role
    const adminUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!adminUser || adminUser.role !== "ADMIN") {
      console.log("User is not admin, returning 403");
      return NextResponse.json({ error: "Accès interdit : administrateur requis" }, { status: 403 });
    }

    const { id } = await params;

    // Verify user exists in Prisma
    const user = await prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      console.log("User not found, returning 404");
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Parse request body
    const { status } = await request.json();
    if (status !== "DEACTIVATED" && status !== "ACTIVE") {
      console.log("Invalid status, returning 400");
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    // Check if user is already in the desired state
    if (user.status === status) {
      console.log(`User already ${status}, returning 400`);
      return NextResponse.json(
        { error: `Utilisateur déjà ${status === "DEACTIVATED" ? "désactivé" : "actif"}` },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: { status: "ACTIVE" | "DEACTIVATED"; role?: "UNDEFINED" | "ADMIN" | "DEMANDEUR" | "GESTIONNAIRE" | "MAGASINNIER"; previousRole?: "UNDEFINED" | "ADMIN" | "DEMANDEUR" | "GESTIONNAIRE" | "MAGASINNIER" | null } = { status };

    if (status === "DEACTIVATED") {
      updateData.role = "UNDEFINED";
      updateData.previousRole = user.role; // Store current role before deactivation
    } else if (status === "ACTIVE") {
      updateData.role = user.previousRole || "UNDEFINED"; // Restore previous role or default to UNDEFINED
      updateData.previousRole = null; // Clear previousRole after reactivation
    }

    console.log(`Updating user status to ${status}${status === "DEACTIVATED" ? " and role to UNDEFINED, saving previous role" : ` and restoring role to ${updateData.role}`}`);
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Update Clerk user metadata
    if (user.clerkUserId && process.env.CLERK_SECRET_KEY) {
      try {
        console.log("Updating Clerk user metadata for:", user.clerkUserId);
        await clerk.users.updateUser(user.clerkUserId, {
          publicMetadata: {
            status,
            role: updateData.role,
          },
        });
        console.log("Clerk user metadata updated");
      } catch (clerkError: unknown) {
        console.error("Clerk error:", clerkError);
        // Log but don't fail the request, as Prisma update is the primary action
      }
    }

    return NextResponse.json(
      { message: `Utilisateur ${status === "DEACTIVATED" ? "désactivé" : "réactivé"} avec succès` },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { error: `Erreur lors de la ${status === "DEACTIVATED" ? "désactivation" : "réactivation"} de l'utilisateur`, details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}