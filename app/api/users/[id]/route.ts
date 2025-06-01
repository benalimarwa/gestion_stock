// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/clerk-sdk-node";

const prisma = new PrismaClient();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string } >}) {
  const { id } =await params;

  try {
    // Vérifier si l'utilisateur existe dans Prisma
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Supprimer l'utilisateur dans Clerk
    await clerk.users.deleteUser(id).catch((err) => {
      console.error("Erreur lors de la suppression dans Clerk:", err);
      throw new Error("Impossible de supprimer l'utilisateur dans Clerk");
    });

    // Supprimer l'utilisateur dans Prisma
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Utilisateur supprimé avec succès" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}