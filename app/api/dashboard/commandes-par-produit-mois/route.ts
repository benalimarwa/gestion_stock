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

    // Process approved demands by month (count each DemandeProduit entry once)
    approvedDemands.forEach(demand => {
      const approvalDate = demand.demande.dateApprouvee || demand.demande.createdAt;
      const month = approvalDate.getMonth();
      monthlyData[month].approved += 1; // Count each DemandeProduit entry once
      monthlyData[month].total += 1;
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
            id: true, // Include commandeId to group by order
            dateLivraison: true,
            statut: true,
          },
        },
      },
    });

    console.log(`Trouvé ${deliveredOrders.length} lignes de commandes livrées pour le produit ${productId}`);
    console.log('Delivered Orders (raw):', deliveredOrders.map(o => ({
      commandeId: o.commande.id,
      quantite: o.quantite,
      dateLivraison: o.commande.dateLivraison,
    })));

    // Group delivered orders by commandeId to count each Commande only once
    const uniqueDeliveredOrders = new Map<string, { dateLivraison: Date }>();
    deliveredOrders.forEach(order => {
      if (order.commande.dateLivraison) {
        const commandeId = order.commande.id;
        if (!uniqueDeliveredOrders.has(commandeId)) {
          uniqueDeliveredOrders.set(commandeId, { dateLivraison: order.commande.dateLivraison });
        }
      }
    });

    console.log(`Trouvé ${uniqueDeliveredOrders.size} commandes livrées uniques pour le produit ${productId}`);
    console.log('Unique Delivered Orders:', Array.from(uniqueDeliveredOrders.entries()).map(([id, data]) => ({
      commandeId: id,
      dateLivraison: data.dateLivraison,
    })));

    // Process unique delivered orders by month
    uniqueDeliveredOrders.forEach((data, commandeId) => {
      const month = data.dateLivraison.getMonth();
      monthlyData[month].delivered += 1; // Count each unique Commande once
      monthlyData[month].total += 1;
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