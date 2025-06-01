import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log("Tentative de récupération et création des notifications...");

    // 1. Vérifier et créer des notifications pour les demandes en attente
    const demandesEnAttente = await prisma.demande.findMany({
      where: { statut: "EN_ATTENTE" },
      include: {
        produits: { include: { produit: true } },
        demandeur: { include: { user: true } },
      },
    });

    for (const demande of demandesEnAttente) {
      const produitsList = demande.produits.map(dp => `${dp.produit.nom} (${dp.quantite})`).join(", ");
      const demandeurName = demande.demandeur.user.name || "Utilisateur";
      const description = `Demande en attente de ${demandeurName} pour: ${produitsList}`;

      // Créer une notification pour l'admin
      const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
      if (admin) {
        const notificationExistante = await prisma.notification.findFirst({
          where: {
            userId: admin.id,
            message: description,
            dateEnvoi: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!notificationExistante) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              message: description,
              typeEnvoi: "EMAIL",
              dateEnvoi: new Date(),
            },
          });
          console.log(`Notification créée pour demande en attente: ${demande.id}`);
        }
      }
    }

    // 2. Vérifier et créer des notifications pour les commandes en cours
    const commandesEnCours = await prisma.commande.findMany({
      where: { statut: "EN_COURS" },
      include: {
        fournisseur: true,
        produits: { include: { produit: true } },
      },
    });

    for (const commande of commandesEnCours) {
      const produitsList = commande.produits.map(cp => `${cp.produit.nom} (${cp.quantite})`).join(", ");
      const description = `Nouvelle commande en cours (ID: ${commande.id}) auprès de ${commande.fournisseur.nom}: ${produitsList}`;

      // Créer une notification pour l'admin
      const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
      if (admin) {
        const notificationExistante = await prisma.notification.findFirst({
          where: {
            userId: admin.id,
            message: description,
            dateEnvoi: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!notificationExistante) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              message: description,
              typeEnvoi: "EMAIL",
              dateEnvoi: new Date(),
            },
          });
          console.log(`Notification créée pour commande en cours: ${commande.id}`);
        }
      }
    }

    // 3. Récupérer toutes les notifications existantes
    const notifications = await prisma.notification.findMany({
      orderBy: { dateEnvoi: "desc" },
      include: { utilisateur: true },
    });

    const mappedNotifications = notifications.map((notification) => {
      let demandeId: string | undefined = undefined;
      if (notification.message.includes("Demande en attente")) {
        const match = notification.message.match(/Demande en attente de .+ pour: .+ \(ID: (.+)\)/);
        if (match) demandeId = match[1];
      } else if (notification.message.includes("Demande approuvée")) {
        const match = notification.message.match(/Demande approuvée pour .+ \(ID: (.+)\)/);
        if (match) demandeId = match[1];
      }

      return {
        id: notification.id,
        message: notification.message,
        dateEnvoi: notification.dateEnvoi.toISOString(),
        type: notification.typeEnvoi,
        source: "notification",
        demandeId,
      };
    });

    console.log("Notifications récupérées:", mappedNotifications);
    return NextResponse.json(mappedNotifications);
  } catch (error) {
    console.error("Erreur dans GET /api/notifications/notif:", {
      message: error instanceof Error ? error.message : "Erreur inconnue",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Erreur lors de la récupération des notifications", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "L'ID de la notification est requis" }, { status: 400 });
    }

    const notification = await prisma.notification.findUnique({ where: { id } });

    if (notification) {
      await prisma.notification.delete({ where: { id } });
      return NextResponse.json({ message: "Notification supprimée avec succès" });
    } else {
      return NextResponse.json({ error: "Notification non trouvée" }, { status: 404 });
    }
  } catch (error) {
    console.error("Erreur dans DELETE /api/notifications/notif:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la notification" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;
    console.log("PATCH appelé avec:", { id, action });

    if (!id || !action) {
      return NextResponse.json({ error: "ID de la demande et action sont requis" }, { status: 400 });
    }

    if (action !== "APPROUVER" && action !== "REJETER") {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    const demande = await prisma.demande.findUnique({
      where: { id },
      include: {
        produits: { include: { produit: true } },
        demandeur: { include: { user: true } },
      },
    });

    if (!demande) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    if (action === "APPROUVER") {
      const produitsInsuffisants = demande.produits.filter(dp => dp.produit.quantite < dp.quantite);
      if (produitsInsuffisants.length > 0) {
        const produitsList = produitsInsuffisants.map(dp => `${dp.produit.nom} (disponible: ${dp.produit.quantite}, demandé: ${dp.quantite})`).join(", ");
        return NextResponse.json({ success: false, error: `Stock insuffisant pour: ${produitsList}` }, { status: 400 });
      }

      await prisma.demande.update({
        where: { id },
        data: { statut: "APPROUVEE", dateApprouvee: new Date() },
      });

      for (const demandeProduit of demande.produits) {
        const nouveauStock = demandeProduit.produit.quantite - demandeProduit.quantite;
        await prisma.produit.update({
          where: { id: demandeProduit.produitId },
          data: { quantite: nouveauStock },
        });
      }

      const produitsList = demande.produits.map(dp => `${dp.produit.nom} (${dp.quantite})`).join(", ");
      const description = `Demande approuvée pour ${demande.demandeur.user.name || "Utilisateur"}: ${produitsList} (ID: ${demande.id})`;

      // Créer une notification pour l'admin
      const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
      if (admin) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            message: description,
            typeEnvoi: "EMAIL",
            dateEnvoi: new Date(),
          },
        });
        console.log("Notification DEMANDE_APPROUVEE créée pour l'admin");
      }

      // Créer une notification pour le demandeur
      await prisma.notification.create({
        data: {
          userId: demande.demandeur.userId,
          message: `Votre demande a été approuvée: ${produitsList} (ID: ${demande.id})`,
          typeEnvoi: "EMAIL",
          dateEnvoi: new Date(),
        },
      });
      console.log("Notification DEMANDE_APPROUVEE créée pour le demandeur");

      return NextResponse.json({ success: true, message: "Demande approuvée avec succès" });
    } else if (action === "REJETER") {
      await prisma.demande.update({
        where: { id },
        data: { statut: "REJETEE" },
      });

      const produitsList = demande.produits.map(dp => `${dp.produit.nom} (${dp.quantite})`).join(", ");
      const description = `Demande rejetée pour ${demande.demandeur.user.name || "Utilisateur"}: ${produitsList} (ID: ${demande.id})`;

      // Créer une notification pour l'admin
      const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
      if (admin) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            message: description,
            typeEnvoi: "EMAIL",
            dateEnvoi: new Date(),
          },
        });
        console.log("Notification DEMANDE_REJETEE créée pour l'admin");
      }

      // Créer une notification pour le demandeur
      await prisma.notification.create({
        data: {
          userId: demande.demandeur.userId,
          message: `Votre demande a été rejetée: ${produitsList} (ID: ${demande.id})`,
          typeEnvoi: "EMAIL",
          dateEnvoi: new Date(),
        },
      });
      console.log("Notification DEMANDE_REJETEE créée pour le demandeur");

      return NextResponse.json({ success: true, message: "Demande rejetée avec succès" });
    }
  } catch (error) {
    console.error("Erreur dans PATCH /api/notifications/notif:", error);
    return NextResponse.json({ error: "Erreur lors du traitement de la demande" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}