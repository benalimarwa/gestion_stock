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

    // Check if user is an admin, gestionnaire, or magasinier
    if (
      dbUser.role !== "ADMIN" &&
      dbUser.role !== "GESTIONNAIRE" &&
      dbUser.role !== "MAGASINNIER"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { nom, contact, score } = body;

    if (!nom || !contact) {
      return NextResponse.json(
        { error: "Name and contact are required" },
        { status: 400 }
      );
    }

    // Create new supplier
    const supplier = await prisma.fournisseur.create({
      data: {
        nom,
        contact,
        score: score ? parseFloat(score) : null,
      },
    });

    // Create notification for admin
    await prisma.notification.create({
      data: {
        userId: dbUser.id,
        message: `New supplier created: ${nom}`,
        typeEnvoi: "SYSTEM",
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Error creating supplier:", error);
    return NextResponse.json(
      {
        error:
          "Failed to create supplier: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}