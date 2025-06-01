import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fournisseurId = searchParams.get('fournisseurId');
    console.log('Requête reçue pour fournisseurId:', fournisseurId);

    if (!fournisseurId) {
      return NextResponse.json(
        { error: 'Identifiant du fournisseur requis' },
        { status: 400 }
      );
    }

    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id: fournisseurId },
    });
    console.log('Fournisseur trouvé:', fournisseur);

    if (!fournisseur) {
      return NextResponse.json(
        { error: 'Fournisseur non trouvé' },
        { status: 404 }
      );
    }

    const commandes = await prisma.commande.findMany({
      where: {
        fournisseurId,
        statut: {
          in: ['EN_COURS', 'ANNULEE', 'EN_RETOUR', 'LIVREE'],
        },
      },
      select: {
        id: true,
        statut: true,
        dateLivraison: true,
        datePrevu: true,
        createdAt: true,
        updatedAt: true,
        produits: {
          include: {
            produit: {
              select: {
                nom: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(
      'Commandes récupérées:',
      commandes.map((c) => ({
        id: c.id,
        statut: c.statut,
        dateLivraison: c.dateLivraison ? c.dateLivraison.toISOString() : 'null',
        datePrevu: c.datePrevu ? c.datePrevu.toISOString() : 'null',
      }))
    );

    const demandesExceptionnelles = await prisma.demandeExceptionnelle.findMany({
      where: {
        fournisseurId,
        statut: {
          in: ['COMMANDEE', 'LIVREE'],
        },
      },
      select: {
        id: true,
        statut: true,
        datePrevu: true,
        dateLivraison: true, // Added to fetch dateLivraison
        createdAt: true,
        updatedAt: true,
        produitsExceptionnels: {
          include: {
            produitExceptionnel: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(
      'Demandes exceptionnelles récupérées:',
      demandesExceptionnelles.map((d) => ({
        id: d.id,
        statut: d.statut,
        dateLivraison: d.dateLivraison ? d.dateLivraison.toISOString() : 'null',
        datePrevu: d.datePrevu ? d.datePrevu.toISOString() : 'null',
      }))
    );

    return NextResponse.json({
      commandes,
      demandesExceptionnelles,
    });
  } catch (error) {
    console.error('Erreur détaillée lors de la récupération:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
