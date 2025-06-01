import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const fournisseurs = await prisma.fournisseur.findMany({
      select: {
        id: true,
        nom: true,
        contact: true,
      },
    });
    return NextResponse.json(fournisseurs, { status: 200 });
  } catch (error) {
    console.error("Erreur dans GET /api/admin/fourprod:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des fournisseurs" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nom, contact } = await request.json();

    // Validation
    if (!nom || !contact) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants (nom, contact)" },
        { status: 400 }
      );
    }

    // Create supplier
    const fournisseur = await prisma.fournisseur.create({
      data: {
        nom,
        contact,
      },
      select: {
        id: true,
        nom: true,
        contact: true,
      },
    });

    return NextResponse.json(fournisseur, { status: 201 });
  } catch (error) {
    console.error("Erreur dans POST /api/admin/fourprod:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du fournisseur" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}