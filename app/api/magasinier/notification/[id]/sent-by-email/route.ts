import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params:Promise< { id: string } >}
) {
  try {
    const {id:notificationId }= await params;
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        { message: "Utilisateur non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier le rôle magasinier
    const dbUser = await prisma.user.findFirst({
      where: { clerkUserId: user.id },
    });

    if (!dbUser || dbUser.role !== "MAGASINNIER") {
      return NextResponse.json(
        { message: "Accès interdit - Rôle MAGASINNIER requis" },
        { status: 403 }
      );
    }

    // Vérifier que la notification existe et appartient à l'utilisateur
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId, userId: dbUser.id },
    });

    if (!notification) {
      return NextResponse.json(
        { message: "Notification non trouvée ou accès non autorisé" },
        { status: 404 }
      );
    }

    

    return NextResponse.json({
      success: true,
      message: "Notification marquée comme envoyée par email",
    });
  } catch (error: any) {
    console.error("Erreur lors de la mise à jour de la notification:", error);
    return NextResponse.json(
      {
        message: "Une erreur est survenue lors de la mise à jour de la notification",
        error: error.message,
      },
      { status: 500 }
    );
  }
}