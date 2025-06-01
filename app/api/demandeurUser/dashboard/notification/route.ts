// app/api/demandeurUser/dashboard/notification/route.ts
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Find the user in our database using clerkUserId
    const dbUser = await prisma.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Get all notifications for this user
    const notifications = await prisma.notification.findMany({
      where: {
        userId: dbUser.id,
      },
      orderBy: {
        dateEnvoi: 'desc',
      },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}