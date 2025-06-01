import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

// Types pour une meilleure gestion TypeScript
interface MonthlyData {
  month: string;
  approved: number;  // Quantité Sortie (sum of quantities)
  delivered: number; // Quantité Entrée (sum of quantities)
  total: number;     // Total quantity (sum of approved + delivered)
}

interface ApprovedDemand {
  quantite: number;
  demande: {
    id: string;
    dateApprouvee: Date | null;
  };
}

interface DeliveredOrder {
  quantite: number;
  id: string;
  commande: {
    id: string;
    date: Date;
  };
}

interface Product {
  id: string;
  nom: string;
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');

  if (!productId) {
    console.error('API Error: Product ID is missing');
    return NextResponse.json(
      { error: 'Product ID is required' },
      { status: 400 }
    );
  }

  if (!productId.match(/^[0-9a-fA-F-]{36}$/)) {
    console.error(`API Error: Invalid productId format: ${productId}`);
    return NextResponse.json(
      { error: 'Invalid productId format' },
      { status: 400 }
    );
  }

  try {
    const product: Product | null = await prisma.produit.findUnique({
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

    // Utiliser l'année actuelle pour les dates de début et de fin
    const currentYear = new Date().getFullYear();
    const startDate = new Date(`${currentYear}-01-01`);
    const endDate = new Date(`${currentYear}-12-31`);

    const monthlyData: MonthlyData[] = monthNames.map((month) => ({
      month,
      approved: 0,  // Quantité Sortie (sum of quantities)
      delivered: 0, // Quantité Entrée (sum of quantities)
      total: 0,     // Total quantity (sum of approved + delivered)
    }));

    console.log(`API: Querying approved demands for productId ${productId}`);
    const approvedDemands: ApprovedDemand[] = await prisma.demandeProduit.findMany({
      where: {
        produitId: productId,
        demande: {
          statut: 'APPROUVEE',
          dateApprouvee: {
            gte: startDate,
            lte: endDate,
            not: null,
          },
        },
      },
      select: {
        quantite: true,
        demande: {
          select: {
            id: true,
            dateApprouvee: true,
          },
        },
      },
    });

    console.log(`API: Found ${approvedDemands.length} approved demands for product ${product.nom} (ID: ${productId})`);
    console.log('Approved Demands:', approvedDemands.map((d) => ({
      quantite: d.quantite,
      dateApprouvee: d.demande.dateApprouvee,
    })));

    approvedDemands.forEach((item: ApprovedDemand) => {
      if (item.demande.dateApprouvee) {
        const date = new Date(item.demande.dateApprouvee);
        if (!isNaN(date.getTime())) {
          const monthIndex = date.getMonth(); // 0 = January, 11 = December
          if (monthIndex >= 0 && monthIndex < 12) {
            monthlyData[monthIndex].approved += item.quantite;
            monthlyData[monthIndex].total += item.quantite;
          }
        } else {
          console.warn(`API Warning: Invalid dateApprouvee for demande ${item.demande.id}`);
        }
      }
    });

    console.log(`API: Querying delivered orders for productId ${productId}`);
    const deliveredOrders: DeliveredOrder[] = await prisma.commandeProduit.findMany({
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
      select: {
        quantite: true,
        id: true,
        commande: {
          select: {
            id: true,
            date: true,
          },
        },
      },
    });

    console.log(`API: Found ${deliveredOrders.length} delivered orders for product ${product.nom} (ID: ${productId})`);
    console.log('Delivered Orders:', deliveredOrders.map((o) => ({
      quantite: o.quantite,
      date: o.commande.date,
    })));

    if (deliveredOrders.length === 0) {
      console.warn(`API Warning: No delivered orders found for productId ${productId} with statut LIVREE between ${startDate} and ${endDate}`);
    }

    deliveredOrders.forEach((item: DeliveredOrder) => {
      if (item.commande.date) {
        const date = new Date(item.commande.date);
        if (!isNaN(date.getTime())) {
          const monthIndex = date.getMonth(); // 0 = January, 11 = December
          if (monthIndex >= 0 && monthIndex < 12) {
            monthlyData[monthIndex].delivered += item.quantite;
            monthlyData[monthIndex].total += item.quantite;
          }
        } else {
          console.warn(`API Warning: Invalid date for commande ${item.commande.id}`);
        }
      }
    });

    console.log('API: Monthly Data:', monthlyData);
    return NextResponse.json(monthlyData);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`API Error: Failed to process productId ${productId}:`, error);
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des statistiques des commandes',
        details: errMsg,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect().catch((err) => {
      console.error(`API Error: Failed to disconnect Prisma client:`, err);
    });
  }
}