
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
// Remove the AdminAchat import as it's not needed here
// import { AdminAchat } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    console.log("Clerk User ID:", user.id);

    // Find or create the User record
    let userRecord = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
    });

    if (!userRecord) {
      console.log("Creating new User record for Clerk User ID:", user.id);
      if (!user.emailAddresses || user.emailAddresses.length === 0) {
        return NextResponse.json(
          { error: "Aucune adresse e-mail trouvée pour l'utilisateur Clerk" },
          { status: 400 }
        );
      }
      try {
        userRecord = await prisma.user.create({
          data: {
            clerkUserId: user.id,
            name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.emailAddresses[0].emailAddress,
            email: user.emailAddresses[0].emailAddress,
            role: "MAGASINNIER",
          },
        });
        console.log("Created User Record:", userRecord);

        await prisma.magasinier.create({
          data: { userId: userRecord.id },
        });
        console.log("Created Magasinier Record for User ID:", userRecord.id);
      } catch (error) {
        console.error("Error creating User/Magasinier:", error);
        return NextResponse.json(
          { error: "Erreur lors de la création de l'utilisateur ou du magasinier" },
          { status: 500 }
        );
      }
    }

    // Verify the user is a Magasinier
    const magasinier = await prisma.magasinier.findUnique({
      where: { userId: userRecord.id },
      include: { user: true },
    });

    if (!magasinier || magasinier.user.role !== "MAGASINNIER") {
      return NextResponse.json(
        { error: "Utilisateur non autorisé. Seuls les magasiniers peuvent créer des commandes." },
        { status: 403 }
      );
    }

    let data;
    try {
      data = await req.json();
      console.log("Request Data:", data);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json(
        { error: "Corps de la requête JSON invalide" },
        { status: 400 }
      );
    }

    // Validate products
    if (!data.produits || !Array.isArray(data.produits) || data.produits.length === 0) {
      return NextResponse.json(
        { error: "La commande doit contenir au moins un produit" },
        { status: 400 }
      );
    }

    // Verify products
    for (const item of data.produits) {
      if (!item.produitId || typeof item.produitId !== "string") {
        return NextResponse.json(
          { error: `Produit ID invalide: ${item.produitId}` },
          { status: 400 }
        );
      }
      try {
        const produit = await prisma.produit.findUnique({
          where: { id: item.produitId },
        });
        if (!produit) {
          return NextResponse.json(
            { error: `Produit avec ID ${item.produitId} non trouvé` },
            { status: 400 }
          );
        }
        if (!item.quantite || item.quantite <= 0 || !Number.isInteger(Number(item.quantite))) {
          return NextResponse.json(
            { error: `La quantité pour le produit ${produit.nom} doit être un entier supérieur à 0` },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error(`Error validating product ${item.produitId}:`, error);
        return NextResponse.json(
          { error: `Erreur lors de la validation du produit ${item.produitId}` },
          { status: 500 }
        );
      }
    }

    // Get default fournisseur if not provided
    let fournisseurId = data.fournisseurId;
    if (!fournisseurId) {
      const defaultFournisseur = await prisma.fournisseur.findFirst();
      if (!defaultFournisseur) {
        return NextResponse.json(
          { error: "Aucun fournisseur par défaut trouvé. Veuillez ajouter un fournisseur." },
          { status: 400 }
        );
      }
      fournisseurId = defaultFournisseur.id;
      console.log("Using default fournisseur ID:", fournisseurId);
    } else {
      const fournisseur = await prisma.fournisseur.findUnique({
        where: { id: fournisseurId },
      });
      if (!fournisseur) {
        return NextResponse.json(
          { error: `Fournisseur avec ID ${fournisseurId} non trouvé` },
          { status: 400 }
        );
      }
    }

    console.log("Creating commande...");
    // Create the commande
    let commande;
    try {
      commande = await prisma.commande.create({
        data: {
          statut: data.statut || "NON_VALIDE",
          magasinierRequestedId: userRecord.id,
          fournisseurId: fournisseurId,
          date: new Date(),
          datePrevu: data.datePrevu ? new Date(data.datePrevu) : new Date(),
          produits: {
            create: data.produits.map((item: { produitId: string; quantite: number }) => ({
              produit: { connect: { id: item.produitId } },
              quantite: item.quantite,
              reordered: false,
            })),
          },
        },
        include: {
          produits: { include: { produit: true } },
          magasinierRequested: true,
          fournisseur: true,
        },
      });
      console.log("Commande created:", commande.id);
    } catch (error) {
      console.error("Error creating commande:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json(
        { error: "Erreur lors de la création de la commande dans la base de données" },
        { status: 500 }
      );
    }

    // Create notifications
    try {
      console.log("Fetching admins...");
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });
      console.log("Admins found:", admins.length);

      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            message: `Nouvelle commande créée par ${magasinier.user.name || "Magasinier"} (ID: ${commande.id}) avec ${commande.produits.length} produit(s)`,
            typeEnvoi: "SYSTEME",
          })),
        });
        console.log("Notifications created for admins");
      }
    } catch (error) {
      console.error("Error creating notifications:", error);
    }

    return NextResponse.json(commande, { status: 201 });
  } catch (error) {
    console.error("Detailed error during commande creation:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      data: await req.json().catch(() => "Failed to parse request body"),
    });
    return NextResponse.json(
      { error: "Erreur inattendue lors de la création de la commande" },
      { status: 500 }
    );
  }
}
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    console.log("Clerk User ID (GET):", user.id);

    // Find the User record by clerkUserId
    const userRecord = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
    });

    console.log("User Record (GET):", userRecord);

    if (!userRecord) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé dans la base de données." },
        { status: 404 }
      );
    }

    // Verify the user is a Magasinier
    const magasinier = await prisma.magasinier.findUnique({
      where: { userId: userRecord.id },
      include: { user: true },
    });

    console.log("Magasinier Record (GET):", magasinier);
    console.log("User Role (GET):", magasinier?.user.role);

    if (!magasinier || magasinier.user.role !== "MAGASINNIER") {
      return NextResponse.json(
        { error: "Utilisateur non autorisé. Seuls les magasiniers peuvent voir leurs commandes." },
        { status: 403 }
      );
    }

    // Fetch commands filtered by magasinierRequestedId
    const commandes = await prisma.commande.findMany({
      where: {
        magasinierRequestedId: userRecord.id, // Filter by User.id
      },
      include: {
        fournisseur: true,
        produits: {
          include: {
            produit: {
              include: {
                categorie: true,
              },
            },
          },
        },
        magasinierRequested: {
          select: {
            name: true,
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

    return NextResponse.json(commandes);
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    console.log("Clerk User ID (PATCH):", user.id);

    // Find the User record by clerkUserId
    const userRecord = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
    });

    console.log("User Record (PATCH):", userRecord);

    if (!userRecord) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé dans la base de données." },
        { status: 404 }
      );
    }

    // Verify the user is a Magasinier
    const magasinier = await prisma.magasinier.findUnique({
      where: { userId: userRecord.id },
      include: { user: true },
    });

    console.log("Magasinier Record (PATCH):", magasinier);
    console.log("User Role (PATCH):", magasinier?.user.role);

    if (!magasinier || magasinier.user.role !== "MAGASINNIER") {
      return NextResponse.json(
        { error: "Utilisateur non autorisé. Seuls les magasiniers peuvent modifier leurs commandes." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const commandeId = url.searchParams.get("id");

    if (!commandeId) {
      return NextResponse.json(
        { error: "ID de commande manquant" },
        { status: 400 }
      );
    }

    // Verify the command exists and belongs to the user
    const commande = await prisma.commande.findUnique({
      where: { id: commandeId },
    });

    if (!commande) {
      return NextResponse.json(
        { error: "Commande non trouvée" },
        { status: 404 }
      );
    }

    if (commande.magasinierRequestedId !== userRecord.id) {
      return NextResponse.json(
        { error: "Accès non autorisé. Vous ne pouvez modifier que vos propres commandes." },
        { status: 403 }
      );
    }

    const data = await req.json();
    const updateData: any = {};

    // Update status if provided
    if (data.statut) {
      if (!["NON_VALIDE", "EN_COURS"].includes(data.statut)) {
        return NextResponse.json(
          { error: "Statut invalide pour une commande modifiable par un magasinier" },
          { status: 400 }
        );
      }
      updateData.statut = data.statut;
    }

    // Update fournisseur if provided
    if (data.fournisseurId) {
      const fournisseur = await prisma.fournisseur.findUnique({
        where: { id: data.fournisseurId },
      });
      if (!fournisseur) {
        return NextResponse.json(
          { error: `Fournisseur avec ID ${data.fournisseurId} non trouvé` },
          { status: 400 }
        );
      }
      updateData.fournisseurId = data.fournisseurId;
    }

    // Update datePrevu if provided
    if (data.datePrevu) {
      updateData.datePrevu = new Date(data.datePrevu);
    }

    // Update produits if provided
    if (data.produits) {
      if (!Array.isArray(data.produits) || data.produits.length === 0) {
        return NextResponse.json(
          { error: "La liste des produits doit contenir au moins un produit" },
          { status: 400 }
        );
      }

      for (const item of data.produits) {
        const produit = await prisma.produit.findUnique({
          where: { id: item.produitId },
        });

        if (!produit) {
          return NextResponse.json(
            { error: `Produit avec ID ${item.produitId} non trouvé` },
            { status: 400 }
          );
        }

        if (!item.quantite || item.quantite <= 0) {
          return NextResponse.json(
            { error: `La quantité pour le produit ${produit.nom} doit être supérieure à 0` },
            { status: 400 }
          );
        }
      }

      // Delete existing produits
      await prisma.commandeProduit.deleteMany({
        where: { commandeId },
      });

      // Create new produits
      updateData.produits = {
        create: data.produits.map((item: { produitId: string; quantite: number }) => ({
          produit: { connect: { id: item.produitId } },
          quantite: item.quantite,
          reordered: false,
        })),
      };
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Aucune donnée à mettre à jour" },
        { status: 400 }
      );
    }

    const updatedCommande = await prisma.commande.update({
      where: { id: commandeId },
      data: updateData,
      include: {
        produits: {
          include: {
            produit: true,
          },
        },
        magasinierRequested: true,
        fournisseur: true,
      },
    });

    return NextResponse.json(updatedCommande, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la commande:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la commande" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    console.log("Clerk User ID (DELETE):", user.id);

    // Find the User record by clerkUserId
    const userRecord = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
    });

    console.log("User Record (DELETE):", userRecord);

    if (!userRecord) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé dans la base de données." },
        { status: 404 }
      );
    }

    // Verify the user is a Magasinier
    const magasinier = await prisma.magasinier.findUnique({
      where: { userId: userRecord.id },
      include: { user: true },
    });

    console.log("Magasinier Record (DELETE):", magasinier);
    console.log("User Role (DELETE):", magasinier?.user.role);

    if (!magasinier || magasinier.user.role !== "MAGASINNIER") {
      return NextResponse.json(
        { error: "Utilisateur non autorisé. Seuls les magasiniers peuvent supprimer leurs commandes." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const commandeId = url.searchParams.get("id");

    if (!commandeId) {
      return NextResponse.json(
        { error: "ID de commande manquant" },
        { status: 400 }
      );
    }

    // Verify the command exists and belongs to the user
    const commande = await prisma.commande.findUnique({
      where: { id: commandeId },
    });

    if (!commande) {
      return NextResponse.json(
        { error: "Commande non trouvée" },
        { status: 404 }
      );
    }

    if (commande.magasinierRequestedId !== userRecord.id) {
      return NextResponse.json(
        { error: "Accès non autorisé. Vous ne pouvez supprimer que vos propres commandes." },
        { status: 403 }
      );
    }

    if (commande.statut !== "NON_VALIDE") {
      return NextResponse.json(
        { error: "Seules les commandes non validées peuvent être supprimées" },
        { status: 400 }
      );
    }

    // Delete related CommandeProduit entries
    await prisma.commandeProduit.deleteMany({
      where: { commandeId },
    });

    // Delete the command
    await prisma.commande.delete({
      where: { id: commandeId },
    });

    return NextResponse.json(
      { message: "Commande supprimée avec succès" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de la suppression de la commande:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la commande" },
      { status: 500 }
    );
  }
}