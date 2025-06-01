import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Initialize PrismaClient outside the handler for reuse
const prisma = new PrismaClient();

// Interfaces for type safety
interface DemandeProduitInput {
  produitId: string;
  quantite: number;
}

interface CreateDemandeBody {
  demandeurId: string;
  produits: DemandeProduitInput[];
}

// Validate date format (YYYY-MM-DD)
const isValidDate = (dateStr: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    if (!isValidDate(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Create start and end date for the day
    const startDate = new Date(`${date}T00:00:00.000Z`);
    const endDate = new Date(`${date}T23:59:59.999Z`);

    const demandes = await prisma.demande.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        demandeur: {
          include: {
            user: true,
          },
        },
        produits: {
          include: {
            produit: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(demandes);
  } catch (error) {
    console.error("Error fetching demandes:", error);
    return NextResponse.json(
      { error: "Failed to fetch demandes" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateDemandeBody;
    const { demandeurId, produits } = body;

    // Validate input
    if (!demandeurId || typeof demandeurId !== "string") {
      return NextResponse.json(
        { error: "Valid demandeurId is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(produits) || produits.length === 0) {
      return NextResponse.json(
        { error: "At least one produit is required" },
        { status: 400 }
      );
    }

    for (const p of produits) {
      if (!p.produitId || typeof p.produitId !== "string") {
        return NextResponse.json(
          { error: "Each produit must have a valid produitId" },
          { status: 400 }
        );
      }
      if (!p.quantite || typeof p.quantite !== "number" || p.quantite <= 0) {
        return NextResponse.json(
          { error: "Each produit must have a valid positive quantite" },
          { status: 400 }
        );
      }
    }

    // Verify Demandeur exists
    const demandeur = await prisma.demandeur.findUnique({
      where: { id: demandeurId },
    });
    if (!demandeur) {
      return NextResponse.json(
        { error: "Demandeur not found" },
        { status: 404 }
      );
    }

    // Verify all produits exist
    const produitIds = produits.map((p) => p.produitId);
    const existingProduits = await prisma.produit.findMany({
      where: { id: { in: produitIds } },
      select: { id: true },
    });
    const existingProduitIds = new Set(existingProduits.map((p) => p.id));
    const invalidProduitIds = produitIds.filter((id) => !existingProduitIds.has(id));
    if (invalidProduitIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid produitIds: ${invalidProduitIds.join(", ")}` },
        { status: 400 }
      );
    }

    // Create Demande with related DemandeProduit
    const demande = await prisma.demande.create({
      data: {
        demandeurId,
        statut: "EN_ATTENTE",
        produits: {
          create: produits.map((p) => ({
            produitId: p.produitId,
            quantite: p.quantite,
          })),
        },
      },
      include: {
        demandeur: { include: { user: true } },
        produits: { include: { produit: true } },
      },
    });

    // Create an Alerte for the pending demand
    await prisma.alerte.create({
      data: {
        produitId: produits[0].produitId,
        typeAlerte: "DEMANDE_EN_ATTENTE",
        description: `Demande #${demande.id.slice(0, 8)} en attente par ${demande.demandeur.user.email}`,
        date: new Date(), // Explicitly set date as required by schema
      },
    });

    return NextResponse.json(demande, { status: 201 });
  } catch (error) {
    console.error("Erreur dans POST /api/demandes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}