import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vérifier la méthode HTTP
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed', details: 'Only GET requests are allowed' });
  }

  try {
    // Connexion à la base de données via Prisma
    await prisma.$connect();
    console.log('Prisma connected successfully');

    // Récupérer toutes les commandes livrées avec leurs produits associés
    const commandes = await prisma.commande.findMany({
      where: {
        statut: 'LIVREE',
      },
      include: {
        produits: {
          include: {
            produit: true,
          },
        },
      },
    });

    console.log('Fetched commandes:', commandes);

    // Liste des mois à considérer
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin'];
    const dataByProduct: { [key: string]: { product: string; Janvier: number; Février: number; Mars: number; Avril: number; Mai: number; Juin: number } } = {};

    // Traiter chaque commande
    for (const commande of commandes) {
      if (!commande.dateLivraison) {
        console.log('Skipping commande with missing dateLivraison:', commande.id);
        continue;
      }

      const month = new Date(commande.dateLivraison).toLocaleString('fr-FR', { month: 'long' });
      if (!months.includes(month)) {
        console.log('Skipping commande with invalid month:', month, 'Commande ID:', commande.id);
        continue;
      }

      if (!commande.produits || !Array.isArray(commande.produits)) {
        console.log('Skipping commande with invalid produits:', commande.id);
        continue;
      }

      // Traiter chaque produit de la commande
      for (const commandeProduit of commande.produits) {
        if (!commandeProduit.produit || !commandeProduit.produit.nom) {
          console.log('Skipping produit with missing nom:', commandeProduit);
          continue;
        }

        const productName = commandeProduit.produit.nom;

        // Initialiser les données pour ce produit s'il n'existe pas encore
        if (!dataByProduct[productName]) {
          dataByProduct[productName] = {
            product: productName,
            Janvier: 0,
            Février: 0,
            Mars: 0,
            Avril: 0,
            Mai: 0,
            Juin: 0,
          };
        }

        // Ajouter la quantité au mois correspondant
        switch (month) {
          case 'Janvier':
            dataByProduct[productName].Janvier += commandeProduit.quantite;
            break;
          case 'Février':
            dataByProduct[productName].Février += commandeProduit.quantite;
            break;
          case 'Mars':
            dataByProduct[productName].Mars += commandeProduit.quantite;
            break;
          case 'Avril':
            dataByProduct[productName].Avril += commandeProduit.quantite;
            break;
          case 'Mai':
            dataByProduct[productName].Mai += commandeProduit.quantite;
            break;
          case 'Juin':
            dataByProduct[productName].Juin += commandeProduit.quantite;
            break;
          default:
            break;
        }
      }
    }

    // Convertir les données en tableau pour le graphique
    const chartData = Object.values(dataByProduct);
    console.log('Chart data:', chartData);

    // Vérifier que chartData est un tableau
    if (!Array.isArray(chartData)) {
      throw new Error("Chart data is not an array");
    }

    // Retourner les données avec un statut 200
    return res.status(200).json(chartData);
  } catch (error) {
    // Gérer les erreurs
    console.error('Error in /api/dashboard/commandes-par-produit-mois:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  } finally {
    // Déconnexion de Prisma
    await prisma.$disconnect();
    console.log('Prisma disconnected');
  }
}