// /api/commandes/route.js (ou dans un fichier de routes approprié)
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request:NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // Format attendu : YYYY-MM-DD

    if (!date) {
      return NextResponse.json({ error: 'Date manquante' }, { status: 400 });
    }

    // Convertir la date en un intervalle (début et fin de la journée)
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Récupérer les commandes pour cette date
    const commandes = await prisma.commande.findMany({
      where: {
        createdAt: {
          gte: startOfDay, // Greater than or equal
          lte: endOfDay,   // Less than or equal
        },
      },
      include: {
        fournisseur: true,
        produits: {
          include: { produit: true },
        },
      },
    });

    return NextResponse.json(commandes, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}