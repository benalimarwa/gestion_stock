import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser,auth } from "@clerk/nextjs/server";


export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const dbUser = await prisma.user.findFirst({
      where: { clerkUserId: user.id },
    });

   

    console.log("Executing prisma.registre.findMany...");
    const registreEntries = await prisma.registre.findMany({
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    console.log("Query result:", registreEntries);

    return NextResponse.json(registreEntries, { status: 200 });
  } catch (error: any) {
    console.error("Erreur lors de la récupération des entrées du registre:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { message: "Une erreur est survenue", details: error.message },
      { status: 500 }
    );
  }
}
export async function POST(request: Request) {
  try {
    const { userId } = auth();
    console.log("POST /api/registre - User ID:", userId);
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });
    console.log("POST /api/registre - User found:", user);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Utilisateur non trouvé ou non admin" }, { status: 403 });
    }

    const body = await request.json();
    console.log("POST /api/registre - Request body:", body);
    const { actionType, description } = body;

    if (!actionType || !description) {
      return NextResponse.json({ error: "actionType et description sont requis" }, { status: 400 });
    }

    const registre = await prisma.registre.create({
      data: {
        userId: user.id,
        actionType,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log("POST /api/registre - Registre created:", registre);

    return NextResponse.json(registre, { status: 201 });
  } catch (error) {
    console.error("Erreur dans /api/registre:", {
     
      error,
    });
    return NextResponse.json(
      { error: "Erreur serveur interne"},
      { status: 500 }
    );
  }
}