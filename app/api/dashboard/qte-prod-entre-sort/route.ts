import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to get the names of all months
function getMonthNames() {
  return [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');

  if (!productId) {
    return NextResponse.json(
      { error: 'Product ID is required' },
      { status: 400 }
    );
  }

  try {
    // Use the range from your seed data (April 1, 2024, to March 30, 2025)
    const startDate = new Date('2024-04-01');
    const endDate = new Date('2025-03-30');

    // Initialize data structure with all months
    const monthNames = getMonthNames();
    const monthlyData = monthNames.map(month => ({
      month,
      approved: 0,
      delivered: 0,
      total: 0,
    }));

    // Get approved demands for the product in the range
    const approvedDemands = await prisma.demandeProduit.findMany({
      where: {
        produitId: productId,
        demande: {
          statut: 'APPROUVEE',
          OR: [
            { dateApprouvee: { gte: startDate, lte: endDate } },
            {
              AND: [
                { dateApprouvee: null },
                { createdAt: { gte: startDate, lte: endDate } },
              ],
            },
          ],
        },
      },
      include: {
        demande: {
          select: {
            createdAt: true,
            dateApprouvee: true,
            statut: true,
          },
        },
      },
    });

    console.log(`Trouvé ${approvedDemands.length} demandes approuvées pour le produit ${productId}`);
    console.log('Approved Demands:', approvedDemands.map(d => ({
      quantite: d.quantite,
      dateApprouvee: d.demande.dateApprouvee,
      createdAt: d.demande.createdAt,
    })));

    // Process approved demands by month
    approvedDemands.forEach(demand => {
      const approvalDate = demand.demande.dateApprouvee || demand.demande.createdAt;
      const month = approvalDate.getMonth();
      monthlyData[month].approved += demand.quantite;
      monthlyData[month].total += demand.quantite;
    });

    // Get delivered orders for the product in the range
    const deliveredOrders = await prisma.commandeProduit.findMany({
      where: {
        produitId: productId,
        commande: {
          statut: 'LIVREE',
          dateLivraison: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        commande: {
          select: {
            dateLivraison: true,
            statut: true,
          },
        },
      },
    });

    console.log(`Trouvé ${deliveredOrders.length} commandes livrées pour le produit ${productId}`);
    console.log('Delivered Orders:', deliveredOrders.map(o => ({
      quantite: o.quantite,
      dateLivraison: o.commande.dateLivraison,
    })));

    // Process delivered orders by month
    deliveredOrders.forEach(order => {
      if (order.commande.dateLivraison) {
        const month = order.commande.dateLivraison.getMonth();
        monthlyData[month].delivered += order.quantite; // Sum quantities
        // Optionally, add to total if desired
        monthlyData[month].total += order.quantite;
      }
    });

    return NextResponse.json(monthlyData);
  } catch (error) {
    console.error('Error fetching product orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product orders', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}