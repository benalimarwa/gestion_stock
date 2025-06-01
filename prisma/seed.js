import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Resetting database...");
  await prisma.notification.deleteMany();
  await prisma.demandeProduit.deleteMany();
  await prisma.demande.deleteMany();
  await prisma.commandeProduit.deleteMany();
  await prisma.commande.deleteMany();
  await prisma.produit.deleteMany();
  await prisma.categorie.deleteMany();
  await prisma.gestionnaire.deleteMany();
  await prisma.adminAchat.deleteMany();
  await prisma.demandeur.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding database...");

  // Création des utilisateurs (only the users from the table)
  const admin1 = await prisma.user.create({
    data: {
      email: "marwa.benali2003@gmail.com",
      name: "Marwa Ben Ali",
      role: "ADMIN",
      adminAchat: { create: {} },
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      email: "bn.nessim@gmail.com",
      name: "Nessim BN",
      role: "ADMIN",
      adminAchat: { create: {} },
    },
  });

  const magasinier = await prisma.user.create({
    data: {
      email: "challouffarah103@gmail.com",
      name: "Farah Challouf",
      role: "MAGASINNIER",
      magasinier: { create: {} },
    },
  });

  const gestionnaire = await prisma.user.create({
    data: {
      email: "asmabengamra383@gmail.com",
      name: "Asma Bengamra",
      role: "GESTIONNAIRE",
      gestionnaire: { create: {} },
    },
  });

  const demandeur1 = await prisma.user.create({
    data: {
      email: "bensoltanyakoub@gmail.com",
      name: "Yakoub Bensoltan",
      role: "DEMANDEUR",
      demandeur: {
        create: {
          type: "EMPLOYE",
        },
      },
    },
  });

  const demandeur2 = await prisma.user.create({
    data: {
      email: "miniar553@gmail.com",
      name: "Miniar",
      role: "DEMANDEUR",
      demandeur: {
        create: {
          type: "ENSEIGNANT",
        },
      },
    },
  });

  const demandeur3 = await prisma.user.create({
    data: {
      email: "safa.benali2003@gmail.com",
      name: "Safa Ben Ali",
      role: "DEMANDEUR",
      demandeur: {
        create: {
          type: "EMPLOYE",
        },
      },
    },
  });

  // Création des catégories
  const categorie1 = await prisma.categorie.create({
    data: {
      nom: "Matériel Informatique",
    },
  });

  const categorie2 = await prisma.categorie.create({
    data: {
      nom: "Matériel de Bureau",
    },
  });

  // Création des produits
  const produit1 = await prisma.produit.create({
    data: {
      nom: "Ordinateur Portable",
      marque: "HP",
      quantite: 10,
      quantiteMinimale: 2,
      categorieId: categorie1.id,
    },
  });

  const produit2 = await prisma.produit.create({
    data: {
      nom: "Imprimante",
      marque: "Canon",
      quantite: 5,
      quantiteMinimale: 1,
      categorieId: categorie2.id,
    },
  });

  const produit3 = await prisma.produit.create({
    data: {
      nom: "Clavier",
      marque: "Logitech",
      quantite: 0,
      quantiteMinimale: 5,
      categorieId: categorie1.id,
      statut: "RUPTURE",
    },
  });

  // Création de fournisseurs
  const fournisseur1 = await prisma.fournisseur.create({
    data: {
      nom: "Fournisseur X",
      contact: "contact@fournisseur.com",
    },
  });

  const fournisseur2 = await prisma.fournisseur.create({
    data: {
      nom: "Fournisseur Y",
      contact: "contact@fournisseury.com",
    },
  });

  // Associer des produits aux fournisseurs
  await prisma.produitFournisseur.create({
    data: {
      produitId: produit1.id,
      fournisseurId: fournisseur1.id,
    },
  });

  await prisma.produitFournisseur.create({
    data: {
      produitId: produit2.id,
      fournisseurId: fournisseur2.id,
    },
  });

  // Création de demandes (actions pour Demandeurs)
  const demande1 = await prisma.demande.create({
    data: {
      demandeurId: demandeur1.demandeur?.id!,
      produits: {
        create: [
          {
            produitId: produit1.id,
            quantite: 1,
          },
          {
            produitId: produit2.id,
            quantite: 2,
          },
        ],
      },
    },
  });

  const demande2 = await prisma.demande.create({
    data: {
      demandeurId: demandeur2.demandeur?.id!,
      produits: {
        create: {
          produitId: produit3.id,
          quantite: 3,
        },
      },
      statut: "APPROUVEE",
      adminId: admin1.id,
      dateApprouvee: new Date(),
    },
  });

  const demande3 = await prisma.demande.create({
    data: {
      demandeurId: demandeur3.demandeur?.id!,
      produits: {
        create: {
          produitId: produit1.id,
          quantite: 5,
        },
      },
      statut: "REJETEE",
      raisonRefus: "Quantité insuffisante",
      adminId: admin2.id,
    },
  });

  // Création de commandes (actions for Gestionnaire, Magasinier, Admin)
  const commande1 = await prisma.commande.create({
    data: {
      fournisseurId: fournisseur1.id,
      produits: {
        create: {
          produitId: produit1.id,
          quantite: 5,
        },
      },
      statut: "LIVREE",
      dateLivraison: new Date(),
      magasinierReceivedId: magasinier.id,
    },
  });

  const commande2 = await prisma.commande.create({
    data: {
      fournisseurId: fournisseur2.id,
      produits: {
        create: {
          produitId: produit2.id,
          quantite: 3,
        },
      },
      statut: "VALIDE",
      adminId: admin1.id,
      datePrevu: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  const commande3 = await prisma.commande.create({
    data: {
      fournisseurId: fournisseur1.id,
      produits: {
        create: {
          produitId: produit3.id,
          quantite: 10,
        },
      },
      statut: "NON_VALIDE",
      gestionnaireId: gestionnaire.id,
      datePrevu: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    },
  });

  const commande4 = await prisma.commande.create({
    data: {
      fournisseurId: fournisseur2.id,
      produits: {
        create: {
          produitId: produit1.id,
          quantite: 2,
        },
      },
      statut: "EN_COURS",
      magasinierRequestedId: magasinier.id,
      datePrevu: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    },
  });

  const commande5 = await prisma.commande.create({
    data: {
      fournisseurId: fournisseur1.id,
      produits: {
        create: {
          produitId: produit2.id,
          quantite: 4,
        },
      },
      statut: "VALIDE",
      adminId: admin2.id,
      datePrevu: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    },
  });

  // Ajouter des notifications pour les Admins
  await prisma.notification.create({
    data: {
      userId: admin1.id,
      message: "Nouvelle commande validée avec succès.",
      dateEnvoi: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: admin2.id,
      message: "Demande rejetée pour quantité insuffisante.",
      dateEnvoi: new Date(),
    },
  });

  // Ajouter une alerte pour le produit en rupture (action visible pour le Gestionnaire)
  await prisma.alerte.create({
    data: {
      produitId: produit3.id,
      typeAlerte: "RUPTURE_STOCK",
      description: "Stock épuisé pour Clavier Logitech.",
      date: new Date(),
    },
  });

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });