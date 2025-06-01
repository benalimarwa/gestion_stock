import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "L'ID de l'alerte est requis" }, { status: 400 });
    }

    const alerte = await prisma.alerte.findUnique({ where: { id } });
    if (!alerte) {
      return NextResponse.json({ error: "Alerte non trouvée" }, { status: 404 });
    }


    return NextResponse.json({ message: "Alerte marquée comme lue" });
  } catch (error) {
    console.error("Erreur dans /api/notifications/alerte/mark-as-read:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour", details: String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}