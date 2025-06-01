import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getMonthNames() {
  // Calendar year: January to December
  return [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');

  if (!productId) {
    console.error('API Error: Product ID is missing');
    return NextResponse.json(
      { error: 'Product ID is required' },
      { status: 400 }
    );
  }

  try {
    const currentYear = new Date().getFullYear(); // 2025
    const startDate = new Date(currentYear, 0, 1); // January 1, 2025
    const endDate = new Date(currentYear, 11, 31); // December 31, 2025

    const monthNames = getMonthNames();
    const monthlyData = monthNames.map(month => ({
      month,
      approved: 0, // Quantité Sortie
      delivered: 0, // Quantité Entrée
    }));

    // Validate product existence
    const product = await prisma.produit.findUnique({
      where: { id: productId },
      select: { id: true, nom: true },
    });

    if (!product) {
      console.warn(`API Warning: Product not found for ID: ${productId}`);
      return NextResponse.json(
        { error: `Product not found for ID: ${productId}` },
        { status: 404 }
      );
    }
    console.log(`API: Processing product ${product.nom} (ID: ${productId})`);

    // Get approved demands for the product in the range (Quantité Sortie)
    const approvedDemands = await prisma.demandeProduit.findMany({
      where: {
        produitId: productId,
        demande: {
          statut: 'APPROUVEE',
          OR: [
            { dateApprouvee: { gte: startDate, lte: endDate, not: null } },
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
            id: true,
            createdAt: true,
            dateApprouvee: true,
            statut: true,
          },
        },
      },
    });

    console.log(`API: Found ${approvedDemands.length} approved demands for product ${product.nom}:`, approvedDemands);

    // Process approved demands by month (Quantité Sortie)
    approvedDemands.forEach(demand => {
      const approvalDate = demand.demande.dateApprouvee || demand.demande.createdAt;
      if (approvalDate && !isNaN(new Date(approvalDate).getTime())) {
        const date = new Date(approvalDate);
        const monthIndex = date.getMonth(); // 0-based index (0 for January, 11 for December)
        monthlyData[monthIndex].approved += demand.quantite;
        console.log(`Adding ${demand.quantite} to ${monthNames[monthIndex]} (approved) for demand ${demand.demande.id}`);
      } else {
        console.warn(`Invalid or null date for demand ${demand.demande.id}: ${approvalDate}`);
      }
    });

    // Get delivered orders for the product in the range (Quantité Entrée)
    const deliveredOrders = await prisma.commandeProduit.findMany({
      where: {
        produitId: productId,
        commande: {
          statut: 'LIVREE',
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        commande: {
          select: {
            id: true,
            date: true,
            statut: true,
          },
        },
      },
    });

    console.log(`API: Found ${deliveredOrders.length} delivered orders for product ${product.nom}:`, deliveredOrders);

    // Process delivered orders by month (Quantité Entrée)
    deliveredOrders.forEach(order => {
      if (order.commande.date && !isNaN(new Date(order.commande.date).getTime())) {
        const date = new Date(order.commande.date);
        const monthIndex = date.getMonth(); // 0-based index
        monthlyData[monthIndex].delivered += order.quantite;
        console.log(`Adding ${order.quantite} to ${monthNames[monthIndex]} (delivered) for order ${order.commande.id}`);
      } else {
        console.warn(`Invalid or null date for order ${order.commande.id}: ${order.commande.date}`);
      }
    });

    console.log('API: Final Monthly Data:', monthlyData);
    return NextResponse.json(monthlyData);
  } catch (error) {
    console.error('Error fetching product quantities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product quantities', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}