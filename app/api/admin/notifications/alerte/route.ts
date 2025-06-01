import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

async function isAdmin(request: NextRequest) {
  const { userId } = getAuth(request);
  if (!userId) {
    console.log("No userId found in auth");
    return false;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { role: true },
    });
    const isAdmin = user?.role === "ADMIN";
    console.log(`User ${userId} isAdmin: ${isAdmin}`);
    return isAdmin;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and role
    console.log("Processing GET request for alerts");
    if (!(await isAdmin(request))) {
      console.log("Unauthorized access attempt");
      return NextResponse.json({ error: "Accès non autorisé. Réservé aux admins." }, { status: 401 });
    }

    // Fetch products to check for alerts and update their status
    console.log("Fetching products");
    const products = await prisma.produit.findMany({
      select: {
        id: true,
        nom: true,
        marque: true,
        quantite: true,
        quantiteMinimale: true,
        createdAt: true,
        updatedAt: true,
        categorieId: true,
        remarque: true,
        statut: true,
      },
    });
    console.log(`Fetched ${products.length} products`);

    // Update product status based on stock levels
    for (const product of products) {
      let newStatut = product.statut;
      if (product.quantite === 0) {
        newStatut = "RUPTURE";
      } else if (product.quantite <= product.quantiteMinimale) {
        newStatut = "CRITIQUE";
      } else {
        newStatut = "NORMALE";
      }

      if (newStatut !== product.statut) {
        console.log(`Updating product ${product.id} status to ${newStatut}`);
        await prisma.produit.update({
          where: { id: product.id },
          data: { statut: newStatut },
        });
      }
    }

    // Fetch existing alerts
    console.log("Fetching existing alerts");
    const existingAlerts = await prisma.alerte.findMany({
      select: {
        id: true,
        produitId: true,
        typeAlerte: true,
        description: true,
      },
    });
    console.log(`Fetched ${existingAlerts.length} existing alerts`);

    const existingAlertProductIds = new Set(existingAlerts.map(alert => alert.produitId).filter((id): id is string => id !== null));

    // Create new alerts for products with low stock, avoiding duplicates
    const newAlerts = [];
    for (const product of products) {
      if (existingAlertProductIds.has(product.id)) {
        continue; // Skip if an alert already exists for this product
      }

      if (product.quantite === 0) {
        console.log(`Creating RUPTURE alert for product ${product.id}`);
        const newAlert = await prisma.alerte.create({
          data: {
            date: new Date(),
            produitId: product.id,
            typeAlerte: "RUPTURE",
            description: `Stock épuisé pour le produit ${product.nom} (${product.marque}).`,
          },
        });
        newAlerts.push(newAlert);
        existingAlertProductIds.add(product.id);
      } else if (product.quantite <= product.quantiteMinimale) {
        console.log(`Creating CRITIQUE alert for product ${product.id}`);
        const newAlert = await prisma.alerte.create({
          data: {
            date: new Date(),
            produitId: product.id,
            typeAlerte: "CRITIQUE",
            description: `Stock critique pour le produit ${product.nom} (${product.marque}). Quantité: ${product.quantite}, Minimum: ${product.quantiteMinimale}.`,
          },
        });
        newAlerts.push(newAlert);
        existingAlertProductIds.add(product.id);
      }
    }
    console.log(`Created ${newAlerts.length} new alerts`);

    // Clean up stale alerts (e.g., if a product is restocked)
    for (const alert of existingAlerts) {
      if (!alert.produitId) {
        console.log(`Deleting alert ${alert.id} with no produitId`);
        await prisma.alerte.delete({
          where: { id: alert.id },
        });
        continue;
      }
      const product = products.find(p => p.id === alert.produitId);
      if (product && product.quantite > product.quantiteMinimale && product.statut === "NORMALE") {
        console.log(`Deleting stale alert ${alert.id} for product ${product.id}`);
        await prisma.alerte.delete({
          where: { id: alert.id },
        });
      }
    }

    // Fetch updated alerts
    console.log("Fetching updated alerts");
    const alertes = await prisma.alerte.findMany({
      orderBy: { date: "desc" },
      include: { produit: true },
    });
    console.log(`Fetched ${alertes.length} updated alerts`);

    // Map alerts to the expected format
    const mappedAlertes = alertes.map((alerte) => ({
      id: alerte.id,
      date: alerte.date.toISOString(),
      typeAlerte: alerte.typeAlerte,
      description: alerte.description,
      produit: alerte.produit
        ? {
            id: alerte.produit.id,
            createdAt: alerte.produit.createdAt.toISOString(),
            updatedAt: alerte.produit.updatedAt.toISOString(),
            nom: alerte.produit.nom,
            marque: alerte.produit.marque,
            quantite: alerte.produit.quantite,
            quantiteMinimale: alerte.produit.quantiteMinimale,
            categorieId: alerte.produit.categorieId,
            remarque: alerte.produit.remarque,
            statut: alerte.produit.statut,
          }
        : null,
      produitId: alerte.produitId,
    }));

    console.log("Returning response with alerts");
    return NextResponse.json({
      alertes: mappedAlertes,
      nouvellesAlertes: newAlerts.length,
    });
  } catch (error) {
    console.error("Erreur dans GET /api/admin/notifications/alerte:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des alertes",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("Processing DELETE request for alert");
    // Check authentication and role
    if (!(await isAdmin(request))) {
      console.log("Unauthorized access attempt");
      return NextResponse.json({ error: "Accès non autorisé. Réservé aux admins." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      console.log("Missing alert ID");
      return NextResponse.json({ error: "ID de l'alerte requis" }, { status: 400 });
    }

    console.log(`Deleting alert ${id}`);
    await prisma.alerte.delete({
      where: { id },
    });

    console.log("Alert deleted successfully");
    return NextResponse.json({ message: "Alerte supprimée avec succès" });
  } catch (error) {
    console.error("Erreur dans DELETE /api/admin/notifications/alerte:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la suppression de l'alerte",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}