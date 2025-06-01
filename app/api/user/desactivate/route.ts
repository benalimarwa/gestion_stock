import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";

const prisma = new PrismaClient();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function PATCH(request: NextRequest) {
  try {
    console.log("Received PATCH to /api/user/deactivate");
    const { userId } = auth();
    if (!userId) {
      console.log("Authentication failed: No userId found");
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    console.log("Authenticated userId:", userId);

    // Verify Prisma connection
    await prisma.$connect();
    console.log("Prisma connected");

    // Update Prisma
    const user = await prisma.user.update({
      where: { clerkUserId: userId },
      data: {
        status: "DEACTIVATED",
        role: "UNDEFINED",
      },
    });
    console.log("Prisma user updated:", user);

    // Update Clerk publicMetadata
    console.log("Fetching Clerk user:", userId);
    const clerkUser = await clerk.users.getUser(userId);
    console.log("Updating Clerk publicMetadata");
    await clerk.users.updateUser(userId, {
      publicMetadata: {
        ...clerkUser.publicMetadata,
        status: "DEACTIVATED",
        role: "UNDEFINED",
      },
    });
    console.log("Clerk publicMetadata updated for user:", userId);

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la désactivation:", error);
    let errorMessage = "Erreur interne du serveur";
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes("RecordNotFound")) {
        errorMessage = "Utilisateur non trouvé dans la base de données";
      } else if (error.message.includes("Clerk")) {
        errorMessage = "Échec de la mise à jour de Clerk";
      } else if (error.message.includes("Prisma")) {
        errorMessage = "Erreur de connexion à la base de données";
      }
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    console.log("Disconnecting Prisma");
    await prisma.$disconnect();
  }
}