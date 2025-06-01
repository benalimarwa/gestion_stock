import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Verify the user is an admin
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Utilisateur non trouvé ou non admin" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // Format: YYYY-MM-DD

    if (!date) {
      return NextResponse.json({ error: "Date manquante" }, { status: 400 });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Format de date invalide (attendu: YYYY-MM-DD)" }, { status: 400 });
    }

    // Convert date to start and end of day
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Fetch commandes where datePrevue is within the date range and statut is EN_COURS
    const commandes = await prisma.commande.findMany({
      where: {
        datePrevu: {
          gte: startOfDay, // Greater than or equal
          lte: endOfDay,   // Less than or equal
        },
        statut: "EN_COURS",
      },
      include: {
        fournisseur: {
          select: { nom: true },
        },
        produits: {
          include: {
            produit: {
              select: { nom: true },
            },
          },
        },
      },
    });

    // Format response to match frontend expectations
    const formattedCommandes = commandes.map((commande) => ({
      id: commande.id,
      fournisseur: {
        nom: commande.fournisseur.nom,
      },
      produits: commande.produits
        .filter((p) => p.produit) // Ensure produit exists
        .map((p) => ({
          produit: { nom: p.produit.nom },
          quantite: p.quantite,
        })),
      createdAt: commande.createdAt.toISOString(),
      statut: commande.statut,
    }));

    return NextResponse.json(formattedCommandes, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}