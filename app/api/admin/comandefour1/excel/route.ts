import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fournisseurId = searchParams.get('fournisseurId');
    console.log('Requête reçue pour export Excel, fournisseurId:', fournisseurId);

    if (!fournisseurId) {
      return NextResponse.json(
        { error: 'Identifiant du fournisseur requis' },
        { status: 400 }
      );
    }

    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id: fournisseurId },
    });

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
        dateLivraison: true,
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

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Single sheet for both Commandes and Demandes Exceptionnelles
    const sheet = workbook.addWorksheet('Commandes et Demandes');
    sheet.columns = [
      { header: 'Type', key: 'type', width: 15 },
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Statut', key: 'statut', width: 15 },
      { header: 'Date de Livraison', key: 'dateLivraison', width: 20 },
      { header: 'Date Prévue', key: 'datePrevu', width: 20 },
      { header: 'Produits', key: 'produits', width: 30 },
      { header: 'Créée le', key: 'createdAt', width: 20 },
      { header: 'Mise à jour le', key: 'updatedAt', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D1E7FF' },
    };

    // Add Commandes
    commandes.forEach((commande) => {
      const produitsText = commande.produits
        .map((p) => `${p.produit.nom} (Qté: ${p.quantite})`)
        .join(', ');
      sheet.addRow({
        type: 'Commande',
        id: commande.id.slice(0, 8) + '...',
        statut: commande.statut,
        dateLivraison: commande.statut === 'LIVREE' && commande.dateLivraison
          ? new Date(commande.dateLivraison).toLocaleDateString('fr-FR')
          : 'Non définie',
        datePrevu: commande.datePrevu
          ? new Date(commande.datePrevu).toLocaleDateString('fr-FR')
          : 'Non définie',
        produits: produitsText,
        createdAt: new Date(commande.createdAt).toLocaleDateString('fr-FR'),
        updatedAt: new Date(commande.updatedAt).toLocaleDateString('fr-FR'),
      });
    });

    // Add Demandes Exceptionnelles
    demandesExceptionnelles.forEach((demande) => {
      const produitsText = demande.produitsExceptionnels
        .map((p) => `${p.produitExceptionnel.name} (Qté: ${p.quantite})`)
        .join(', ');
      sheet.addRow({
        type: 'Demande Exceptionnelle',
        id: demande.id.slice(0, 8) + '...',
        statut: demande.statut,
        dateLivraison: demande.statut === 'LIVREE' && demande.dateLivraison
          ? new Date(demande.dateLivraison).toLocaleDateString('fr-FR')
          : 'Non définie',
        datePrevu: demande.datePrevu
          ? new Date(demande.datePrevu).toLocaleDateString('fr-FR')
          : 'Non définie',
        produits: produitsText,
        createdAt: new Date(demande.createdAt).toLocaleDateString('fr-FR'),
        updatedAt: new Date(demande.updatedAt).toLocaleDateString('fr-FR'),
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="fournisseur_${fournisseur.nom}_details.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

  } catch (error) {
    console.error('Erreur détaillée lors de l\'exportation Excel:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'exportation des données' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
