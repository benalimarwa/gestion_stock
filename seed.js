import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  try {
    // Step 1: Clear existing data in the correct order (child to parent)
    console.log('Clearing existing data...');
    await prisma.registreProduit.deleteMany();
    await prisma.registre.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.commandeProduit.deleteMany();
    await prisma.commande.deleteMany();
    await prisma.demandeProduitExceptionnel.deleteMany();
    await prisma.demandeExceptionnelle.deleteMany();
    await prisma.produitExceptionnel.deleteMany();
    await prisma.demandeProduit.deleteMany();
    await prisma.demande.deleteMany();
    await prisma.demandeur.deleteMany();
    await prisma.magasinier.deleteMany();
    await prisma.adminAchat.deleteMany();
    await prisma.gestionnaire.deleteMany();
    await prisma.alerte.deleteMany();
    await prisma.produitFournisseur.deleteMany();
    await prisma.reporting.deleteMany();
    await prisma.produit.deleteMany();
    await prisma.categorie.deleteMany();
    await prisma.fournisseur.deleteMany();
    await prisma.user.deleteMany();

    // Step 2: Create Categories
    console.log('Creating categories...');
    const categorie1 = await prisma.categorie.create({
      data: { id: crypto.randomUUID(), nom: 'Fournitures de bureau' },
    });
    const categorie2 = await prisma.categorie.create({
      data: { id: crypto.randomUUID(), nom: 'Papeterie' },
    });
    const categorie3 = await prisma.categorie.create({
      data: { id: crypto.randomUUID(), nom: 'Électronique' },
    });
    const categorie4 = await prisma.categorie.create({
      data: { id: crypto.randomUUID(), nom: 'Mobilier' },
    });
    const categorie5 = await prisma.categorie.create({
      data: { id: crypto.randomUUID(), nom: 'Accessoires' },
    });

    // Step 3: Create Products
    console.log('Creating products...');
    const produit1 = await prisma.produit.create({
      data: { id: crypto.randomUUID(), nom: 'Stylo', quantite: 100, categorieId: categorie1.id },
    });
    const produit2 = await prisma.produit.create({
      data: { id: crypto.randomUUID(), nom: 'Cahier', quantite: 50, categorieId: categorie2.id },
    });
    const produit3 = await prisma.produit.create({
      data: { id: crypto.randomUUID(), nom: 'Classeur', quantite: 80, categorieId: categorie1.id },
    });
    const produit4 = await prisma.produit.create({
      data: { id: crypto.randomUUID(), nom: 'Marqueur', quantite: 60, categorieId: categorie2.id },
    });
    const produit5 = await prisma.produit.create({
      data: { id: crypto.randomUUID(), nom: 'Ordinateur portable', quantite: 20, categorieId: categorie3.id },
    });
    const produit6 = await prisma.produit.create({
      data: { id: crypto.randomUUID(), nom: 'Clavier', quantite: 40, categorieId: categorie3.id },
    });
    const produit7 = await prisma.produit.create({
      data: { id: crypto.randomUUID(), nom: 'Souris', quantite: 50, categorieId: categorie3.id },
    });
    const produit8 = await prisma.produit.create({
      data: { id: crypto.randomUUID(), nom: 'Chaise de bureau', quantite: 15, categorieId: categorie4.id },
    });
    const produit9 = await prisma.produit.create({
      data: { id: crypto.randomUUID(), nom: 'Bureau', quantite: 10, categorieId: categorie4.id },
    });
    const produit10 = await prisma.produit.create({
      data: { id: crypto.randomUUID(), nom: 'Agrafeuse', quantite: 30, categorieId: categorie1.id },
    });
    const produit11 = await prisma.produit.create({
      data: { id: crypto.randomUUID(), nom: 'Post-it', quantite: 200, categorieId: categorie2.id },
    });
    const produit12 = await prisma.produit.create({
      data: { id: crypto.randomUUID(), nom: 'Câble HDMI', quantite: 25, categorieId: categorie5.id },
    });

    // Step 4: Create Exceptional Products
    console.log('Creating exceptional products...');
    const produitExceptionnel1 = await prisma.produitExceptionnel.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Imprimante',
        marque: 'TechPrint',
        description: '',
      },
    });
    const produitExceptionnel2 = await prisma.produitExceptionnel.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Projecteur 4K',
        marque: 'VisionTech',
        description: 'Projecteur 4K pour présentations',
      },
    });
    const produitExceptionnel3 = await prisma.produitExceptionnel.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Tableau interactif',
        marque: 'SmartBoard',
        description: 'Tableau interactif pour salles de réunion',
      },
    });

    // Step 5: Create Suppliers
    console.log('Creating suppliers...');
    const fournisseur1 = await prisma.fournisseur.create({
      data: { id: crypto.randomUUID(), nom: 'Fournisseur A', contact: '123-456-7890' },
    });
    const fournisseur2 = await prisma.fournisseur.create({
      data: { id: crypto.randomUUID(), nom: 'Fournisseur B', contact: '987-654-3210' },
    });
    const fournisseur3 = await prisma.fournisseur.create({
      data: { id: crypto.randomUUID(), nom: 'Fournisseur C', contact: '456-789-1234' },
    });

    // Step 6: Create Users (including Safa)
    console.log('Creating users...');
    const userAdmin1 = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: 'marwa.benali2003@gmail.com',
        firstName: 'Marwa',
        lastName: 'Ben Ali',
        role: 'ADMIN',
        clerkUserId: 'user_2wQ4aY2KHwuWQOJ9IjqS78nc579',
        createdAt: new Date(),
        status: 'ACTIVE',
      },
    });
    const userAdmin2 = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: 'bn.nessim@gmail.com',
        firstName: 'Nessim',
        lastName: 'Bn',
        role: 'ADMIN',
        clerkUserId: 'user_bn_nessim_789',
        createdAt: new Date(),
        status: 'ACTIVE',
      },
    });
    const userMagasinier = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: 'challouffarah103@gmail.com',
        firstName: 'Farah',
        lastName: 'Challouf',
        role: 'MAGASINNIER',
        clerkUserId: 'user_2wQ4aY2KHwuWQOJ9IjqS78nc576',
        createdAt: new Date(),
        status: 'ACTIVE',
      },
    });
    const userDemandeur1 = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: 'asmabengamra838@gmail.com',
        firstName: 'Asma',
        lastName: 'Bengamra',
        role: 'DEMANDEUR',
        clerkUserId: 'user_asmabengamra838_123',
        createdAt: new Date(),
        status: 'ACTIVE',
      },
    });
    const userDemandeur2 = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: 'bensoltanyakoub@gmail.com',
        firstName: 'Yakoub',
        lastName: 'Bensoltan',
        role: 'DEMANDEUR',
        clerkUserId: 'user_bensoltanyakoub_456',
        createdAt: new Date(),
        status: 'ACTIVE',
      },
    });
    const userDemandeur3 = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: 'safa.benali2003@gmail.com',
        firstName: 'Safa',
        lastName: 'Demandeur',
        role: 'DEMANDEUR',
        clerkUserId: 'user_safa_demandeur_789',
        createdAt: new Date(),
        status: 'ACTIVE',
      },
    });

    // Step 7: Create role-specific records
    console.log('Creating role-specific records...');
    const adminAchat1 = await prisma.adminAchat.create({
      data: {
        id: crypto.randomUUID(),
        userId: userAdmin1.id,
      },
    });
    const adminAchat2 = await prisma.adminAchat.create({
      data: {
        id: crypto.randomUUID(),
        userId: userAdmin2.id,
      },
    });
    const magasinier = await prisma.magasinier.create({
      data: {
        id: crypto.randomUUID(),
        userId: userMagasinier.id,
      },
    });
    const demandeur1 = await prisma.demandeur.create({
      data: {
        id: crypto.randomUUID(),
        userId: userDemandeur1.id,
        type: 'EMPLOYE',
      },
    });
    const demandeur2 = await prisma.demandeur.create({
      data: {
        id: crypto.randomUUID(),
        userId: userDemandeur2.id,
        type: 'EMPLOYE',
      },
    });
    const demandeur3 = await prisma.demandeur.create({
      data: {
        id: crypto.randomUUID(),
        userId: userDemandeur3.id,
        type: 'EMPLOYE',
      },
    });

    // Step 8: Create Regular Demandes for DEMANDEURs
    console.log('Creating regular Demandes for DEMANDEURs...');
    const demande1 = await prisma.demande.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur1.id, // Asma Bengamra
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-04-20T10:00:00Z'),
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit1.id, quantite: 5 },
            { id: crypto.randomUUID(), produitId: produit2.id, quantite: 3 },
          ],
        },
      },
    });
    const demande2 = await prisma.demande.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur1.id, // Asma Bengamra
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-04-21T09:00:00Z'),
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit3.id, quantite: 4 },
            { id: crypto.randomUUID(), produitId: produit4.id, quantite: 6 },
          ],
        },
      },
    });
    const demande3 = await prisma.demande.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur2.id, // Yakoub Bensoltan
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-04-22T14:00:00Z'),
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit5.id, quantite: 2 },
            { id: crypto.randomUUID(), produitId: produit6.id, quantite: 3 },
          ],
        },
      },
    });
    const demande4 = await prisma.demande.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur1.id, // Asma Bengamra
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-04-25T10:00:00Z'),
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit7.id, quantite: 5 },
            { id: crypto.randomUUID(), produitId: produit12.id, quantite: 3 },
          ],
        },
      },
    });
    const demande5 = await prisma.demande.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur1.id, // Asma Bengamra
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-04-26T11:00:00Z'),
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit5.id, quantite: 2 },
            { id: crypto.randomUUID(), produitId: produit6.id, quantite: 4 },
          ],
        },
      },
    });
    const demande6 = await prisma.demande.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur2.id, // Yakoub Bensoltan
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-04-29T08:00:00Z'),
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit8.id, quantite: 2 },
            { id: crypto.randomUUID(), produitId: produit9.id, quantite: 1 },
          ],
        },
      },
    });
    const demande7 = await prisma.demande.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur1.id, // Asma Bengamra
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-04-30T09:30:00Z'),
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit10.id, quantite: 10 },
            { id: crypto.randomUUID(), produitId: produit11.id, quantite: 20 },
          ],
        },
      },
    });
    const demande8 = await prisma.demande.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur2.id, // Yakoub Bensoltan
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-05-01T10:00:00Z'),
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit12.id, quantite: 5 },
            { id: crypto.randomUUID(), produitId: produit1.id, quantite: 8 },
          ],
        },
      },
    });
    const demande9 = await prisma.demande.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur1.id, // Asma Bengamra
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-05-02T11:00:00Z'),
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit2.id, quantite: 5 },
            { id: crypto.randomUUID(), produitId: produit3.id, quantite: 3 },
          ],
        },
      },
    });
    const demande10 = await prisma.demande.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur2.id, // Yakoub Bensoltan
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-05-03T12:00:00Z'),
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit4.id, quantite: 7 },
            { id: crypto.randomUUID(), produitId: produit7.id, quantite: 4 },
          ],
        },
      },
    });
    // New Regular Demandes for Safa
    const demande11 = await prisma.demande.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur3.id, // Safa
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-05-04T09:00:00Z'),
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit1.id, quantite: 10 },
            { id: crypto.randomUUID(), produitId: produit11.id, quantite: 15 },
          ],
        },
      },
    });
    const demande12 = await prisma.demande.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur3.id, // Safa
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-05-05T10:00:00Z'),
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit5.id, quantite: 3 },
            { id: crypto.randomUUID(), produitId: produit6.id, quantite: 5 },
          ],
        },
      },
    });
    const demande13 = await prisma.demande.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur3.id, // Safa
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-05-06T11:00:00Z'),
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit8.id, quantite: 2 },
            { id: crypto.randomUUID(), produitId: produit9.id, quantite: 1 },
          ],
        },
      },
    });
    const demande14 = await prisma.demande.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur3.id, // Safa
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-05-07T12:00:00Z'),
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit12.id, quantite: 4 },
            { id: crypto.randomUUID(), produitId: produit4.id, quantite: 6 },
          ],
        },
      },
    });

    // Step 9: Admin approves some regular Demandes
    console.log('Admin approving some regular demandes...');
    await prisma.demande.update({
      where: { id: demande1.id },
      data: {
        statut: 'APPROUVEE',
        dateApprouvee: new Date('2025-04-21T11:00:00Z'),
        adminId: userAdmin1.id,
      },
    });
    await prisma.demande.update({
      where: { id: demande3.id },
      data: {
        statut: 'APPROUVEE',
        dateApprouvee: new Date('2025-04-23T15:00:00Z'),
        adminId: userAdmin2.id,
      },
    });
    await prisma.demande.update({
      where: { id: demande4.id },
      data: {
        statut: 'APPROUVEE',
        dateApprouvee: new Date('2025-04-26T12:00:00Z'),
        adminId: userAdmin2.id,
      },
    });
    await prisma.demande.update({
      where: { id: demande6.id },
      data: {
        statut: 'APPROUVEE',
        dateApprouvee: new Date('2025-04-30T09:00:00Z'),
        adminId: userAdmin1.id,
      },
    });
    await prisma.demande.update({
      where: { id: demande8.id },
      data: {
        statut: 'APPROUVEE',
        dateApprouvee: new Date('2025-05-02T11:00:00Z'),
        adminId: userAdmin2.id,
      },
    });
    // Approve some of Safa's regular Demandes
    await prisma.demande.update({
      where: { id: demande11.id },
      data: {
        statut: 'APPROUVEE',
        dateApprouvee: new Date('2025-05-05T10:00:00Z'),
        adminId: userAdmin1.id,
      },
    });
    await prisma.demande.update({
      where: { id: demande13.id },
      data: {
        statut: 'APPROUVEE',
        dateApprouvee: new Date('2025-05-07T12:00:00Z'),
        adminId: userAdmin2.id,
      },
    });

    // Step 10: Create Exceptional Demandes for DEMANDEURs
    console.log('Creating exceptional Demandes for DEMANDEURs...');
    const demandeExceptionnelle1 = await prisma.demandeExceptionnelle.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur1.id, // Asma Bengamra
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-04-22T11:00:00Z'),
        produitsExceptionnels: {
          create: [
            { id: crypto.randomUUID(), produitExceptionnelId: produitExceptionnel1.id, quantite: 1 },
          ],
        },
      },
    });
    const demandeExceptionnelle2 = await prisma.demandeExceptionnelle.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur2.id, // Yakoub Bensoltan
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-04-23T12:00:00Z'),
        produitsExceptionnels: {
          create: [
            { id: crypto.randomUUID(), produitExceptionnelId: produitExceptionnel2.id, quantite: 2 },
          ],
        },
      },
    });
    const demandeExceptionnelle3 = await prisma.demandeExceptionnelle.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur1.id, // Asma Bengamra
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-04-24T10:00:00Z'),
        produitsExceptionnels: {
          create: [
            { id: crypto.randomUUID(), produitExceptionnelId: produitExceptionnel3.id, quantite: 1 },
          ],
        },
      },
    });
    const demandeExceptionnelle4 = await prisma.demandeExceptionnelle.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur2.id, // Yakoub Bensoltan
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-04-29T10:00:00Z'),
        produitsExceptionnels: {
          create: [
            { id: crypto.randomUUID(), produitExceptionnelId: produitExceptionnel1.id, quantite: 2 },
          ],
        },
      },
    });
    const demandeExceptionnelle5 = await prisma.demandeExceptionnelle.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur1.id, // Asma Bengamra
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-04-30T11:00:00Z'),
        produitsExceptionnels: {
          create: [
            { id: crypto.randomUUID(), produitExceptionnelId: produitExceptionnel2.id, quantite: 1 },
          ],
        },
      },
    });
    const demandeExceptionnelle6 = await prisma.demandeExceptionnelle.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur2.id, // Yakoub Bensoltan
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-05-01T12:00:00Z'),
        produitsExceptionnels: {
          create: [
            { id: crypto.randomUUID(), produitExceptionnelId: produitExceptionnel3.id, quantite: 2 },
          ],
        },
      },
    });
    // New Exceptional Demandes for Safa
    const demandeExceptionnelle7 = await prisma.demandeExceptionnelle.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur3.id, // Safa
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-05-04T10:00:00Z'),
        produitsExceptionnels: {
          create: [
            { id: crypto.randomUUID(), produitExceptionnelId: produitExceptionnel1.id, quantite: 1 },
          ],
        },
      },
    });
    const demandeExceptionnelle8 = await prisma.demandeExceptionnelle.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur3.id, // Safa
        statut: 'EN_ATTENTE',
        createdAt: new Date('2025-05-05T11:00:00Z'),
        produitsExceptionnels: {
          create: [
            { id: crypto.randomUUID(), produitExceptionnelId: produitExceptionnel2.id, quantite: 2 },
          ],
        },
      },
    });

    // Step 11: Admin accepts some Exceptional Demandes
    console.log('Admin accepting some exceptional demandes...');
    await prisma.demandeExceptionnelle.update({
      where: { id: demandeExceptionnelle1.id },
      data: {
        statut: 'ACCEPTEE',
        dateApprouvee: new Date('2025-04-23T12:00:00Z'),
      },
    });
    await prisma.demandeExceptionnelle.update({
      where: { id: demandeExceptionnelle2.id },
      data: {
        statut: 'ACCEPTEE',
        dateApprouvee: new Date('2025-04-24T13:00:00Z'),
      },
    });
    await prisma.demandeExceptionnelle.update({
      where: { id: demandeExceptionnelle3.id },
      data: {
        statut: 'ACCEPTEE',
        dateApprouvee: new Date('2025-04-25T14:00:00Z'),
      },
    });
    await prisma.demandeExceptionnelle.update({
      where: { id: demandeExceptionnelle4.id },
      data: {
        statut: 'ACCEPTEE',
        dateApprouvee: new Date('2025-04-30T11:00:00Z'),
      },
    });
    await prisma.demandeExceptionnelle.update({
      where: { id: demandeExceptionnelle5.id },
      data: {
        statut: 'ACCEPTEE',
        dateApprouvee: new Date('2025-05-01T12:00:00Z'),
      },
    });
    // Accept one of Safa's Exceptional Demandes
    await prisma.demandeExceptionnelle.update({
      where: { id: demandeExceptionnelle7.id },
      data: {
        statut: 'ACCEPTEE',
        dateApprouvee: new Date('2025-05-05T11:00:00Z'),
      },
    });

    // Step 12: Magasinier creates Commandes (with fournisseurId)
    console.log('Magasinier creating Commandes...');
    const commande1 = await prisma.commande.create({
      data: {
        id: crypto.randomUUID(),
        fournisseurId: fournisseur1.id,
        statut: 'NON_VALIDE',
        date: new Date('2025-04-22T09:00:00Z'),
        createdAt: new Date('2025-04-22T09:00:00Z'),
        magasinierRequestedId: userMagasinier.id,
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit1.id, quantite: 25, reordered: false },
            { id: crypto.randomUUID(), produitId: produit2.id, quantite: 5, reordered: false },
          ],
        },
      },
    });
    const commande2 = await prisma.commande.create({
      data: {
        id: crypto.randomUUID(),
        fournisseurId: fournisseur2.id,
        statut: 'NON_VALIDE',
        date: new Date('2025-04-23T11:00:00Z'),
        createdAt: new Date('2025-04-23T11:00:00Z'),
        magasinierRequestedId: userMagasinier.id,
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit3.id, quantite: 15, reordered: false },
            { id: crypto.randomUUID(), produitId: produit4.id, quantite: 10, reordered: false },
          ],
        },
      },
    });
    const commande3 = await prisma.commande.create({
      data: {
        id: crypto.randomUUID(),
        fournisseurId: fournisseur3.id,
        statut: 'NON_VALIDE',
        date: new Date('2025-04-24T09:00:00Z'),
        createdAt: new Date('2025-04-24T09:00:00Z'),
        magasinierRequestedId: userMagasinier.id,
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit5.id, quantite: 5, reordered: false },
            { id: crypto.randomUUID(), produitId: produit6.id, quantite: 3, reordered: false },
          ],
        },
      },
    });
    const commande4 = await prisma.commande.create({
      data: {
        id: crypto.randomUUID(),
        fournisseurId: fournisseur1.id,
        statut: 'NON_VALIDE',
        date: new Date('2025-04-29T10:00:00Z'),
        createdAt: new Date('2025-04-29T10:00:00Z'),
        magasinierRequestedId: userMagasinier.id,
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit7.id, quantite: 10, reordered: false },
            { id: crypto.randomUUID(), produitId: produit8.id, quantite: 3, reordered: false },
          ],
        },
      },
    });
    const commande5 = await prisma.commande.create({
      data: {
        id: crypto.randomUUID(),
        fournisseurId: fournisseur2.id,
        statut: 'NON_VALIDE',
        date: new Date('2025-04-30T11:00:00Z'),
        createdAt: new Date('2025-04-30T11:00:00Z'),
        magasinierRequestedId: userMagasinier.id,
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit9.id, quantite: 2, reordered: false },
            { id: crypto.randomUUID(), produitId: produit10.id, quantite: 15, reordered: false },
          ],
        },
      },
    });
    const commande6 = await prisma.commande.create({
      data: {
        id: crypto.randomUUID(),
        fournisseurId: fournisseur3.id,
        statut: 'NON_VALIDE',
        date: new Date('2025-05-01T12:00:00Z'),
        createdAt: new Date('2025-05-01T12:00:00Z'),
        magasinierRequestedId: userMagasinier.id,
        produits: {
          create: [
            { id: crypto.randomUUID(), produitId: produit11.id, quantite: 30, reordered: false },
            { id: crypto.randomUUID(), produitId: produit12.id, quantite: 5, reordered: false },
          ],
        },
      },
    });

    // Step 13: Admin validates Commandes
    console.log('Admin validating Commandes...');
    await prisma.commande.update({
      where: { id: commande1.id },
      data: {
        statut: 'VALIDE',
        adminId: userAdmin1.id,
      },
    });
    await prisma.commande.update({
      where: { id: commande2.id },
      data: {
        statut: 'VALIDE',
        adminId: userAdmin2.id,
      },
    });
    await prisma.commande.update({
      where: { id: commande3.id },
      data: {
        statut: 'VALIDE',
        adminId: userAdmin1.id,
      },
    });
    await prisma.commande.update({
      where: { id: commande4.id },
      data: {
        statut: 'VALIDE',
        adminId: userAdmin2.id,
      },
    });
    await prisma.commande.update({
      where: { id: commande5.id },
      data: {
        statut: 'VALIDE',
        adminId: userAdmin1.id,
      },
    });

    // Step 14: Magasinier marks some Commandes as LIVREE
    console.log('Magasinier marking Commandes as LIVREE...');
    await prisma.commande.update({
      where: { id: commande1.id },
      data: {
        statut: 'LIVREE',
        magasinierReceivedId: userMagasinier.id,
        dateLivraison: new Date('2025-04-25T10:00:00Z'),
      },
    });
    await prisma.commande.update({
      where: { id: commande2.id },
      data: {
        statut: 'LIVREE',
        magasinierReceivedId: userMagasinier.id,
        dateLivraison: new Date('2025-04-26T11:00:00Z'),
      },
    });
    await prisma.commande.update({
      where: { id: commande4.id },
      data: {
        statut: 'LIVREE',
        magasinierReceivedId: userMagasinier.id,
        dateLivraison: new Date('2025-05-01T11:00:00Z'),
      },
    });

    // Step 15: Create Exceptional Demandes with LIVREE and PRISE status
    console.log('Creating LIVREE and PRISE Exceptional Demandes...');
    const demandeExceptionnelleLivree1 = await prisma.demandeExceptionnelle.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur1.id, // Asma Bengamra
        statut: 'LIVREE',
        dateApprouvee: new Date('2025-04-27T10:00:00Z'),
        createdAt: new Date('2025-04-26T09:00:00Z'),
        fournisseurId: fournisseur1.id,
        produitsExceptionnels: {
          create: [
            { id: crypto.randomUUID(), produitExceptionnelId: produitExceptionnel1.id, quantite: 1 },
          ],
        },
      },
    });
    const demandeExceptionnellePrise1 = await prisma.demandeExceptionnelle.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur2.id, // Yakoub Bensoltan
        statut: 'PRISE',
        dateApprouvee: new Date('2025-04-28T11:00:00Z'),
        createdAt: new Date('2025-04-27T09:00:00Z'),
        fournisseurId: fournisseur2.id,
        produitsExceptionnels: {
          create: [
            { id: crypto.randomUUID(), produitExceptionnelId: produitExceptionnel2.id, quantite: 2 },
          ],
        },
      },
    });
    const demandeExceptionnelleLivree2 = await prisma.demandeExceptionnelle.create({
      data: {
        id: crypto.randomUUID(),
        demandeurId: demandeur1.id, // Asma Bengamra
        statut: 'LIVREE',
        dateApprouvee: new Date('2025-05-02T10:00:00Z'),
        createdAt: new Date('2025-05-01T09:00:00Z'),
        fournisseurId: fournisseur3.id,
        produitsExceptionnels: {
          create: [
            { id: crypto.randomUUID(), produitExceptionnelId: produitExceptionnel3.id, quantite: 1 },
          ],
        },
      },
    });

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();