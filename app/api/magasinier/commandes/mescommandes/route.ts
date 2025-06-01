import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { Commande, CommandeProduit, Role, StatutCommande, Prisma } from "@prisma/client";

// Define the type for the commande with included fields
type CommandeWithProduits = {
  id: string;
  statut: StatutCommande;
  createdAt: Date;
  datePrevu: Date | null;
  dateLivraison: Date | null;
  facture: String | null;
  fournisseurId: string | null;
  fournisseur: { id: string; nom: string } | null;
  produits: { quantite: number; produit: { id: string; nom: string; quantite: number } }[];
  admin: { name: string } | null;
  gestionnaire: { name: string } | null;
};

// Define the type for the GET query result using Prisma's GetPayload
type CommandeFromQuery = Prisma.CommandeGetPayload<{
  select: {
    id: true;
    statut: true;
    createdAt: true;
    datePrevu: true;
    dateLivraison: true;
    facture: true;
    fournisseurId: true;
    fournisseur: {
      select: {
        id: true;
        nom: true;
      };
    };
    produits: {
      select: {
        quantite: true;
        produit: {
          select: {
            id: true;
            nom: true;
            quantite: true;
          };
        };
      };
    };
    admin: {
      select: {
        name: true;
      };
    };
    gestionnaire: {
      select: {
        name: true;
      };
    };
  };
}>;

// Define the type for the POST request body
interface CreateCommandeRequestBody {
  produits: { produitId: string; quantite: number }[];
}

// Helper function to ensure a user and magasinier record exists
async function ensureUserAndMagasinier(clerkUser: { id: string; emailAddresses: { emailAddress: string }[]; firstName?: string | null; lastName?: string | null }) {
  let dbUser = await prisma.user.findUnique({
    where: { clerkUserId: clerkUser.id },
  });

  if (!dbUser) {
    console.log(`User with clerkUserId ${clerkUser.id} not found, creating new user...`);
    dbUser = await prisma.user.create({
      data: {
        clerkUserId: clerkUser.id,
        email: clerkUser.emailAddresses[0].emailAddress,
        firstName: clerkUser.firstName || null,
        lastName: clerkUser.lastName || null,
        role: "MAGASINNIER",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`Created user:`, dbUser);

    // Create a Magasinier record for the user
    const magasinier = await prisma.magasinier.create({
      data: {
        userId: dbUser.id,
      },
    });
    console.log(`Created magasinier record:`, magasinier);
  } else {
    // Ensure a magasinier record exists
    const magasinier = await prisma.magasinier.findUnique({
      where: { userId: dbUser.id },
    });
    if (!magasinier) {
      console.log(`Magasinier record not found for user ${dbUser.id}, creating...`);
      await prisma.magasinier.create({
        data: {
          userId: dbUser.id,
        },
      });
      console.log(`Created magasinier record for user ${dbUser.id}`);
    }
  }

  return dbUser;
}

// Récupérer toutes les commandes validées et non validées créées par l'utilisateur connecté
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    console.log("Authenticated user:", user);
    if (!user) {
      console.error("No authenticated user found");
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Ensure the user exists in the database
    const dbUser = await ensureUserAndMagasinier(user);

    const commandes = await prisma.commande.findMany({
      where: {
        statut: {
          in: ["VALIDE", "NON_VALIDE"],
        },
        magasinierRequestedId: dbUser.id,
      },
      select: {
        id: true,
        statut: true,
        createdAt: true,
        datePrevu: true,
        dateLivraison: true,
        facture: true,
        fournisseurId: true,
        fournisseur: {
          select: {
            id: true,
            nom: true,
          },
        },
        produits: {
          select: {
            quantite: true,
            produit: {
              select: {
                id: true,
                nom: true,
                quantite: true,
              },
            },
          },
        },
        admin: {
          select: {
            name: true,
          },
        },
        gestionnaire: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedCommandes = commandes.map((commande: CommandeFromQuery) => ({
      id: commande.id,
      statut: commande.statut,
      date: commande.createdAt.toISOString(),
      datePrevu: commande.datePrevu ? commande.datePrevu.toISOString() : null,
      dateLivraison: commande.dateLivraison ? commande.dateLivraison.toISOString() : null,
      facture: commande.facture,
      fournisseur: commande.fournisseur || { id: "non-défini", nom: "Non défini" },
      produits: commande.produits,
      validatedBy: commande.statut === "VALIDE" && commande.admin ? commande.admin.name : null,
      passedBy: commande.gestionnaire ? commande.gestionnaire.name : null,
    }));

    console.log("Returning commandes:", formattedCommandes);
    return NextResponse.json(formattedCommandes);
  } catch (error: any) {
    console.error("Erreur lors de la récupération des commandes:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
    });
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des commandes", details: error.message },
      { status: 500 }
    );
  }
}

// Créer une nouvelle commande avec statut NON_VALIDE et fournisseur par défaut
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    console.log("Authenticated user:", user);
    if (!user) {
      console.error("No authenticated user found");
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const dbUser = await ensureUserAndMagasinier(user);

    const { produits }: CreateCommandeRequestBody = await req.json();
    console.log("Received produits:", produits);

    if (!produits || !Array.isArray(produits) || produits.length === 0) {
      console.error("Invalid data: produits is empty or invalid", { produits });
      return NextResponse.json(
        { error: "Au moins un produit est requis" },
        { status: 400 }
      );
    }

    for (const prod of produits) {
      if (!prod.produitId || prod.quantite <= 0) {
        console.error("Invalid product data:", prod);
        return NextResponse.json({ error: "Données de produit invalides" }, { status: 400 });
      }
      const produit = await prisma.produit.findUnique({
        where: { id: prod.produitId },
      });
      console.log("Checked produit ID:", prod.produitId, "Found:", !!produit);
      if (!produit) {
        console.error("Product not found:", prod.produitId);
        return NextResponse.json(
          { error: `Produit avec ID ${prod.produitId} non trouvé` },
          { status: 404 }
        );
      }
    }

    let defaultFournisseur = await prisma.fournisseur.findFirst({
      where: { nom: "Non défini" },
    });
    if (!defaultFournisseur) {
      console.log("Creating default fournisseur...");
      defaultFournisseur = await prisma.fournisseur.create({
        data: {
          nom: "Non défini",
          contact: "N/A",
        },
      });
    }
    console.log("Using fournisseur:", defaultFournisseur.id, defaultFournisseur.nom);

    const commande = await prisma.commande.create({
      data: {
        statut: "NON_VALIDE",
        date: new Date(),
        datePrevu: new Date(),
        fournisseur: { connect: { id: defaultFournisseur.id } },
        magasinierRequested: { connect: { id: dbUser.id } },
        produits: {
          create: produits.map((prod) => ({
            quantite: prod.quantite,
            produit: { connect: { id: prod.produitId } },
            reordered: false,
          })),
        },
      },
      include: {
        fournisseur: true,
        produits: {
          include: { produit: true },
        },
      },
    }) as unknown as CommandeWithProduits;

    const formattedCommande = {
      id: commande.id,
      statut: commande.statut,
      date: commande.createdAt.toISOString(),
      fournisseur: commande.fournisseur || { id: "non-défini", nom: "Non défini" },
      produits: commande.produits.map((cp) => ({
        produit: cp.produit,
        quantite: cp.quantite,
      })),
    };

    console.log("Command created for user:", dbUser.id, "Command ID:", commande.id);
    return NextResponse.json(formattedCommande, { status: 201 });
  } catch (error: any) {
    console.error("Erreur lors de la création de la commande:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
    });
    return NextResponse.json(
      { error: "Erreur serveur lors de la création de la commande", details: error.message },
      { status: 500 }
    );
  }
}

// Supprimer une commande non validée créée par l'utilisateur connecté
export async function DELETE(req: NextRequest) {
  try {
    const user = await currentUser();
    console.log("Authenticated user:", user);
    if (!user) {
      console.error("No authenticated user found");
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const dbUser = await ensureUserAndMagasinier(user);

    const url = new URL(req.url);
    const commandeId = url.searchParams.get("id");

    if (!commandeId) {
      console.error("Command ID missing");
      return NextResponse.json(
        { error: "ID de commande manquant" },
        { status: 400 }
      );
    }

    const commande = await prisma.commande.findUnique({
      where: {
        id: commandeId,
      },
    });

    if (!commande) {
      console.error("Command not found:", commandeId);
      return NextResponse.json(
        { error: "Commande non trouvée" },
        { status: 404 }
      );
    }

    if (commande.magasinierRequestedId !== dbUser.id) {
      console.error("User not authorized to delete command:", commandeId);
      return NextResponse.json(
        { error: "Accès non autorisé. Vous ne pouvez supprimer que vos propres commandes." },
        { status: 403 }
      );
    }

    if (commande.statut !== "NON_VALIDE") {
      console.error("Command is not NON_VALIDE:", commandeId);
      return NextResponse.json(
        { error: "Seules les commandes non validées peuvent être supprimées" },
        { status: 400 }
      );
    }

    await prisma.commandeProduit.deleteMany({
      where: {
        commandeId: commandeId,
      },
    });

    await prisma.commande.delete({
      where: {
        id: commandeId,
      },
    });

    console.log("Command deleted:", commandeId, "by user:", dbUser.id);
    return NextResponse.json({ success: true, message: "Commande supprimée avec succès" });
  } catch (error: any) {
    console.error("Erreur lors de la suppression de la commande:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Erreur serveur lors de la suppression de la commande", details: error.message },
      { status: 500 }
    );
  }
}

// PATCH handler to update a command (e.g., validate or modify)
export async function PATCH(req: NextRequest) {
  try {
    const user = await currentUser();
    console.log("Authenticated user:", user);
    if (!user) {
      console.error("No authenticated user found");
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const dbUser = await ensureUserAndMagasinier(user);

    const url = new URL(req.url);
    const commandeId = url.searchParams.get("id");

    if (!commandeId) {
      console.error("Command ID missing");
      return NextResponse.json(
        { error: "ID de commande manquant" },
        { status: 400 }
      );
    }

    const commande = await prisma.commande.findUnique({
      where: { id: commandeId },
    });

    if (!commande) {
      console.error("Command not found:", commandeId);
      return NextResponse.json(
        { error: "Commande non trouvée" },
        { status: 404 }
      );
    }

    if (commande.magasinierRequestedId !== dbUser.id) {
      console.error("User not authorized to modify command:", commandeId);
      return NextResponse.json(
        { error: "Accès non autorisé. Vous ne pouvez modifier que vos propres commandes." },
        { status: 403 }
      );
    }

    const { statut, produits }: { statut?: StatutCommande; produits?: { produitId: string; quantite: number }[] } = await req.json();

    const updateData: any = {};
    if (statut) {
      if (!["VALIDE", "NON_VALIDE"].includes(statut)) {
        return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
      }
      updateData.statut = statut;
    }

    if (produits) {
      if (!Array.isArray(produits) || produits.length === 0) {
        return NextResponse.json({ error: "Liste de produits invalide" }, { status: 400 });
      }
      await prisma.commandeProduit.deleteMany({
        where: { commandeId },
      });
      updateData.produits = {
        create: produits.map((prod) => ({
          quantite: prod.quantite,
          produit: { connect: { id: prod.produitId } },
          reordered: false,
        })),
      };
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
    }

    const updatedCommande = await prisma.commande.update({
      where: { id: commandeId },
      data: updateData,
      include: {
        fournisseur: true,
        produits: {
          include: { produit: true },
        },
      },
    }) as unknown as CommandeWithProduits;

    const formattedCommande = {
      id: updatedCommande.id,
      statut: updatedCommande.statut,
      date: updatedCommande.createdAt.toISOString(),
      fournisseur: updatedCommande.fournisseur || { id: "non-défini", nom: "Non défini" },
      produits: updatedCommande.produits.map((cp) => ({
        produit: cp.produit,
        quantite: cp.quantite,
      })),
    };

    return NextResponse.json(formattedCommande, { status: 200 });
  } catch (error: any) {
    console.error("Erreur lors de la mise à jour de la commande:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour de la commande", details: error.message },
      { status: 500 }
    );
  }
}