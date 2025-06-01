// app/api/demandeurUser/dashboard/notification/unread/route.ts
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Get count of unread notifications
    const unreadCount = await prisma.notification.count({
      where: {
        userId: dbUser.id,
        isRead: false,
      },
    });

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error("Erreur lors de la récupération du nombre de notifications non lues:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}