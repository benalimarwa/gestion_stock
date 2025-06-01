import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { Magasinier, User, Demande, Commande, Produit, DemandeProduit, CommandeProduit, Demandeur } from "@prisma/client";

// Define extended types for better type safety
type DemandeWithRelations = Demande & {
  demandeur: Demandeur & {
    user: {
      email: string;
      name: string | null;
    };
  };
  produits: (DemandeProduit & {
    produit: {
      nom: string;
      marque: string | null;
    };
  })[];
};

type CommandeWithRelations = Commande & {
  produits: (CommandeProduit & {
    produit: {
      nom: string;
      marque: string | null;
    };
  })[];
};

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      console.log("Utilisateur non authentifié");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    console.log("Utilisateur authentifié via Clerk:", user.id, "Email:", user.emailAddresses[0]?.emailAddress);

    const dbUser = await prisma.user.findFirst({
      where: {
        clerkUserId: user.id,
      },
    });

    if (!dbUser) {
      console.log("Utilisateur non trouvé dans la base de données pour clerkUserId:", user.id);
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    console.log("Utilisateur trouvé dans la base de données:", dbUser.id, "Role:", dbUser.role);

    const [approvedDemandes, validatedCommandes] = await Promise.all([
      prisma.demande.findMany({
        where: { statut: "APPROUVEE" },
        include: {
          demandeur: {
            include: { user: { select: { email: true, name: true } } },
          },
          produits: {
            include: {
              produit: { select: { nom: true, marque: true } },
            },
          },
        },
        orderBy: { dateApprouvee: "desc" },
      }),
      prisma.commande.findMany({
        where: { statut: "VALIDE" },
        include: {
          produits: {
            include: {
              produit: { select: { nom: true, marque: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const notifications = [
      ...approvedDemandes.map((demande: DemandeWithRelations) => ({
        id: `demande-${demande.id}`,
        message: `La demande #${demande.id} a été approuvée par ${demande.demandeur.user.name || demande.demandeur.user.email}`,
        dateEnvoi: demande.dateApprouvee?.toISOString() || demande.createdAt.toISOString(),
        type: "DEMANDE_APPROUVEE",
        source: `Demande #${demande.id}`,
        demandeId: demande.id,
        user: { email: demande.demandeur.user.email, name: demande.demandeur.user.name },
        produits: demande.produits.map((p) => ({
          produit: { nom: p.produit.nom, marque: p.produit.marque || "Inconnu" },
          quantite: p.quantite,
        })),
        isRead: false,
      })),
      ...validatedCommandes.map((commande: CommandeWithRelations) => ({
        id: `commande-${commande.id}`,
        message: `La commande #${commande.id} a été validée`,
        dateEnvoi: commande.updatedAt.toISOString(),
        type: "COMMANDE_VALIDEE",
        source: `Commande #${commande.id}`,
        commandeId: commande.id,
        user: null,
        produits: commande.produits.map((p) => ({
          produit: { nom: p.produit.nom, marque: p.produit.marque || "Inconnu" },
          quantite: p.quantite,
        })),
        isRead: false,
      })),
    ];

    console.log(`Notifications générées pour userId ${dbUser.id}:`, notifications.map(n => ({ id: n.id, message: n.message, type: n.type })));

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Erreur dans GET /api/magasinier/notification:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      console.log("Utilisateur non authentifié pour POST");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    console.log("Utilisateur authentifié pour POST:", user.id);

    const dbUser = await prisma.user.findFirst({
      where: {
        clerkUserId: user.id,
      },
    });

    if (!dbUser) {
      console.log("Utilisateur non trouvé pour POST, clerkUserId:", user.id);
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const body = await req.json();
    const { action, demandId, commandId } = body;

    console.log("Requête POST reçue:", { action, demandId, commandId });

    if (!action) {
      console.log("Action manquante dans la requête POST");
      return NextResponse.json(
        { error: "Action requise (APPROVE_DEMAND, MARK_AS_COMMANDEE, or VALIDATE_COMMANDE)" },
        { status: 400 }
      );
    }

    const magasinierUsers = await prisma.user.findMany({
      where: { role: "MAGASINNIER" },
    });

    console.log("Nombre d'utilisateurs MAGASINNIER trouvés:", magasinierUsers.length, "Liste:", magasinierUsers.map((u: User) => u.id));

    if (magasinierUsers.length === 0) {
      console.log("ATTENTION: Aucun utilisateur avec le rôle MAGASINNIER n'a été trouvé");
      console.log("Les notifications ne pourront pas être créées!");
      const allUsersCount = await prisma.user.count();
      console.log("Nombre total d'utilisateurs:", allUsersCount);
      await prisma.notification.create({
        data: {
          userId: dbUser.id,
          message: action === "APPROVE_DEMAND"
            ? `La demande #${demandId} a été approuvée. (Note: Aucun magasinier dans le système)`
            : action === "MARK_AS_COMMANDEE"
            ? `La demande exceptionnelle #${demandId} a été commandée. (Note: Aucun magasinier dans le système)`
            : action === "VALIDATE_COMMANDE"
            ? `La commande #${commandId} a été validée. (Note: Aucun magasinier dans le système)`
            : "Action inconnue",
          dateEnvoi: new Date(),
          isRead: false,
          typeEnvoi: "SYSTEM",
        },
      });
    }

    if (action === "APPROVE_DEMAND") {
      if (!demandId) {
        console.log("demandId manquant pour APPROVE_DEMAND");
        return NextResponse.json(
          { error: "demandId requis pour APPROVE_DEMAND" },
          { status: 400 }
        );
      }

      const demand = await prisma.demande.findUnique({
        where: { id: demandId },
      });

      if (!demand) {
        console.log("Demande non trouvée pour ID:", demandId);
        return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
      }

      if (demand.statut === "APPROUVEE") {
        console.log("Demande déjà approuvée:", demandId);
        return NextResponse.json({ error: "Demande déjà approuvée" }, { status: 400 });
      }

      const updatedDemand = await prisma.demande.update({
        where: { id: demandId },
        data: {
          statut: "APPROUVEE",
          dateApprouvee: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log("Demande approuvée:", updatedDemand);

      if (magasinierUsers.length > 0) {
        const notificationPromises = magasinierUsers.map((magasinier: User) => {
          console.log(`Création de notification pour le magasinier ${magasinier.id}`);
          return prisma.notification.create({
            data: {
              userId: magasinier.id,
              message: `La demande #${demandId} a été approuvée.`,
              dateEnvoi: new Date(),
              isRead: false,
              typeEnvoi: "SYSTEM",
            },
          });
        });

        await Promise.all(notificationPromises);
        console.log(`${magasinierUsers.length} notifications créées pour APPROVE_DEMAND`);
      }

      return NextResponse.json(updatedDemand, { status: 200 });
    }

    if (action === "MARK_AS_COMMANDEE") {
      if (!demandId) {
        console.log("demandId manquant pour MARK_AS_COMMANDEE");
        return NextResponse.json(
          { error: "demandId requis pour MARK_AS_COMMANDEE" },
          { status: 400 }
        );
      }

      const demand = await prisma.demandeExceptionnelle.findUnique({
        where: { id: demandId },
      });

      if (!demand) {
        console.log("Demande exceptionnelle non trouvée pour ID:", demandId);
        return NextResponse.json({ error: "Demande exceptionnelle non trouvée" }, { status: 404 });
      }

      if (demand.statut === "COMMANDEE") {
        console.log("Demande exceptionnelle déjà commandée:", demandId);
        return NextResponse.json({ error: "Demande exceptionnelle déjà commandée" }, { status: 400 });
      }

      const updatedDemand = await prisma.demandeExceptionnelle.update({
        where: { id: demandId },
        data: {
          statut: "COMMANDEE",
          updatedAt: new Date(),
        },
      });

      console.log("Demande exceptionnelle commandée:", updatedDemand);

      if (magasinierUsers.length > 0) {
        const notificationPromises = magasinierUsers.map((magasinier: User) => {
          console.log(`Création de notification pour le magasinier ${magasinier.id}`);
          return prisma.notification.create({
            data: {
              userId: magasinier.id,
              message: `La demande exceptionnelle #${demandId} a été commandée.`,
              dateEnvoi: new Date(),
              isRead: false,
              typeEnvoi: "SYSTEM",
            },
          });
        });

        await Promise.all(notificationPromises);
        console.log(`${magasinierUsers.length} notifications créées pour MARK_AS_COMMANDEE`);
      }

      return NextResponse.json(updatedDemand, { status: 200 });
    }

    if (action === "VALIDATE_COMMANDE") {
      if (!commandId) {
        console.log("commandId manquant pour VALIDATE_COMMANDE");
        return NextResponse.json(
          { error: "commandId requis pour VALIDATE_COMMANDE" },
          { status: 400 }
        );
      }

      const commande = await prisma.commande.findUnique({
        where: { id: commandId },
      });

      if (!commande) {
        console.log("Commande non trouvée pour ID:", commandId);
        return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 });
      }

      if (commande.statut === "VALIDE") {
        console.log("Commande déjà validée:", commandId);
        return NextResponse.json({ error: "Commande déjà validée" }, { status: 400 });
      }

      const updatedCommande = await prisma.commande.update({
        where: { id: commandId },
        data: {
          statut: "VALIDE",
          updatedAt: new Date(),
        },
      });

      console.log("Commande validée:", updatedCommande);

      if (magasinierUsers.length > 0) {
        const notificationPromises = magasinierUsers.map((magasinier: User) => {
          console.log(`Création de notification pour le magasinier ${magasinier.id}`);
          return prisma.notification.create({
            data: {
              userId: magasinier.id,
              message: `La commande #${commandId} a été validée.`,
              dateEnvoi: new Date(),
              isRead: false,
              typeEnvoi: "SYSTEM",
            },
          });
        });

        await Promise.all(notificationPromises);
        console.log(`${magasinierUsers.length} notifications créées pour VALIDATE_COMMANDE`);
      }

      return NextResponse.json(updatedCommande, { status: 200 });
    }

    console.log("Action non reconnue:", action);
    return NextResponse.json(
      { error: "Action non reconnue (doit être APPROVE_DEMAND, MARK_AS_COMMANDEE, ou VALIDATE_COMMANDE)" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erreur lors de la création de la notification:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la création de la notification" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      console.log("Utilisateur non authentifié pour PATCH");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    console.log("Utilisateur authentifié pour PATCH:", user.id);

    const dbUser = await prisma.user.findFirst({
      where: {
        clerkUserId: user.id,
      },
    });

    if (!dbUser) {
      console.log("Utilisateur non trouvé pour PATCH, clerkUserId:", user.id);
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const { pathname } = new URL(req.url);
    const notificationId = pathname.split("/").pop();

    if (!notificationId) {
      console.log("notificationId manquant dans l'URL");
      return NextResponse.json({ error: "ID de notification requis" }, { status: 400 });
    }

    const body = await req.json();
    const { isRead } = body;

    if (typeof isRead !== "boolean") {
      console.log("isRead manquant ou invalide dans la requête PATCH:", body);
      return NextResponse.json({ error: "isRead doit être un booléen" }, { status: 400 });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      console.log("Notification non trouvée pour ID:", notificationId);
      return NextResponse.json({ error: "Notification non trouvée" }, { status: 404 });
    }

    if (notification.userId !== dbUser.id) {
      console.log("Utilisateur non autorisé à modifier cette notification:", { userId: dbUser.id, notificationUserId: notification.userId });
      return NextResponse.json({ error: "Accès interdit - Cette notification ne vous appartient pas" }, { status: 403 });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead,
        updatedAt: new Date(),
      },
    });

    console.log("Notification mise à jour:", updatedNotification);

    return NextResponse.json(updatedNotification, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la notification:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour de la notification" },
      { status: 500 }
    );
  }
}