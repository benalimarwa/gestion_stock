import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const produits = await db.produit.findMany({
      include: {
        categorie: {
          select: { id: true, nom: true },
        },
      },
    });

    return NextResponse.json(produits, { status: 200 });
  } catch (error) {
    console.error("Erreur GET /api/admin/produit:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation manuelle
    const {
      nom,
      marque = "Inconnu",
      quantite,
      quantiteMinimale,
      categorieId,
      fournisseurId,
      remarque,
      critere,
    } = body;

    if (!nom || typeof nom !== "string") {
      return NextResponse.json({ error: "Le nom du produit est requis et doit être une chaîne" }, { status: 400 });
    }
    if (quantite == null || isNaN(quantite) || quantite < 0 || !Number.isInteger(quantite)) {
      return NextResponse.json({ error: "La quantité doit être un entier non négatif" }, { status: 400 });
    }
    if (quantiteMinimale == null || isNaN(quantiteMinimale) || quantiteMinimale < 0 || !Number.isInteger(quantiteMinimale)) {
      return NextResponse.json({ error: "La quantité minimale doit être un entier non négatif" }, { status: 400 });
    }
    if (!categorieId || typeof categorieId !== "string") {
      return NextResponse.json({ error: "L'ID de la catégorie est requis" }, { status: 400 });
    }
    if (!["DURABLE", "CONSOMMABLE"].includes(critere)) {
      return NextResponse.json({ error: "Le critère doit être DURABLE ou CONSOMMABLE" }, { status: 400 });
    }

    // Vérifier si la catégorie existe
    const categorie = await db.categorie.findUnique({ where: { id: categorieId } });
    if (!categorie) {
      return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
    }

    // Calculer le statut
    const statut = quantite === 0 ? "RUPTURE" : quantite <= quantiteMinimale ? "CRITIQUE" : "NORMALE";

    // Créer le produit
    const produit = await db.produit.create({
      data: {
        nom,
        marque,
        quantite,
        quantiteMinimale,
        categorieId,
        remarque: remarque || null,
        critere,
        statut,
      },
      include: {
        categorie: {
          select: { id: true, nom: true },
        },
      },
    });

    // Associer le fournisseur si fourni
    if (fournisseurId) {
      const fournisseur = await db.fournisseur.findUnique({ where: { id: fournisseurId } });
      if (!fournisseur) {
        return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
      }

      await db.produitFournisseur.create({
        data: {
          produitId: produit.id,
          fournisseurId,
        },
      });
    }

    return NextResponse.json(produit, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/admin/produit:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      console.error("Missing product ID in PUT request");
      return NextResponse.json({ error: "ID du produit requis" }, { status: 400 });
    }

    const body = await request.json();
    console.log("PUT /api/admin/produit received body:", body);

    // Validation manuelle
    const {
      nom,
      marque = "Inconnu",
      quantite,
      quantiteMinimale,
      categorieId,
      fournisseurId,
      remarque,
      critere,
    } = body;

    if (!nom || typeof nom !== "string") {
      console.error("Invalid nom:", nom);
      return NextResponse.json({ error: "Le nom du produit est requis et doit être une chaîne" }, { status: 400 });
    }
    if (quantite == null || isNaN(quantite) || quantite < 0 || !Number.isInteger(quantite)) {
      console.error("Invalid quantite:", quantite);
      return NextResponse.json({ error: "La quantité doit être un entier non négatif" }, { status: 400 });
    }
    if (quantiteMinimale == null || isNaN(quantiteMinimale) || quantiteMinimale < 0 || !Number.isInteger(quantiteMinimale)) {
      console.error("Invalid quantiteMinimale:", quantiteMinimale);
      return NextResponse.json({ error: "La quantité minimale doit être un entier non négatif" }, { status: 400 });
    }
    if (!categorieId || typeof categorieId !== "string") {
      console.error("Invalid categorieId:", categorieId);
      return NextResponse.json({ error: "L'ID de la catégorie est requis" }, { status: 400 });
    }
    if (!["DURABLE", "CONSOMMABLE"].includes(critere)) {
      console.error("Invalid critere:", critere);
      return NextResponse.json({ error: "Le critère doit être DURABLE ou CONSOMMABLE" }, { status: 400 });
    }

    // Vérifier si le produit existe
    const produitExist = await db.produit.findUnique({ where: { id } });
    if (!produitExist) {
      console.error("Product not found:", id);
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    // Vérifier si la catégorie existe
    const categorie = await db.categorie.findUnique({ where: { id: categorieId } });
    if (!categorie) {
      console.error("Category not found:", categorieId);
      return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
    }

    // Calculer le statut
    const statut = quantite === 0 ? "RUPTURE" : quantite <= quantiteMinimale ? "CRITIQUE" : "NORMALE";
    console.log(`Updating product ${nom}: quantite=${quantite}, quantiteMinimale=${quantiteMinimale}, statut=${statut}`);

    // Mettre à jour le produit
    const produit = await db.produit.update({
      where: { id },
      data: {
        nom,
        marque,
        quantite,
        quantiteMinimale,
        categorieId,
        remarque: remarque || null,
        critere,
        statut,
      },
      include: {
        categorie: {
          select: { id: true, nom: true },
        },
      },
    });

    // Envoyer des emails si CRITIQUE ou RUPTURE
    if (["CRITIQUE", "RUPTURE"].includes(produit.statut)) {
      console.log(`Product ${produit.nom} has status ${produit.statut}, initiating email alert`);

      // Préparer les données du produit pour l'email
      const productData = {
        id: produit.id,
        nom: produit.nom,
        marque: produit.marque,
        quantite: produit.quantite,
        quantiteMinimale: produit.quantiteMinimale || 0,
      };

      const lowStockProducts = produit.statut === "CRITIQUE" ? [productData] : [];
      const ruptureProducts = produit.statut === "RUPTURE" ? [productData] : [];

      const emailPayload = {
        lowStockProducts,
        ruptureProducts,
      };
      console.log("Email payload:", emailPayload);

      // Envoyer à /api/emails/send-to-all
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const emailUrl = `${baseUrl}/api/emails/send-to-all`;
      console.log(`Sending to ${emailUrl} with payload:`, emailPayload);

      try {
        const emailResponse = await fetch(emailUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailPayload),
        });

        console.log(`Email response from ${emailUrl}:`, {
          status: emailResponse.status,
          statusText: emailResponse.statusText,
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error(`Failed to send email to ${emailUrl}:`, {
            status: emailResponse.status,
            statusText: emailResponse.statusText,
            body: errorText,
          });
        } else {
          const emailResult = await emailResponse.json();
          console.log(`Email sent successfully to ${emailUrl}:`, emailResult);
        }
      } catch (error) {
        console.error(`Fetch error for ${emailUrl}:`, error instanceof Error ? error.message : error);
      }
    } else {
      console.log(`No email alerts needed for product ${produit.nom}: statut=${produit.statut}`);
    }

    // Mettre à jour l'association avec le fournisseur
    if (fournisseurId) {
      const fournisseur = await db.fournisseur.findUnique({ where: { id: fournisseurId } });
      if (!fournisseur) {
        console.error("Fournisseur not found:", fournisseurId);
        return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
      }

      await db.produitFournisseur.deleteMany({ where: { produitId: id } });
      await db.produitFournisseur.create({
        data: { produitId: id, fournisseurId },
      });
    } else {
      await db.produitFournisseur.deleteMany({ where: { produitId: id } });
    }

    return NextResponse.json(produit, { status: 200 });
  } catch (error) {
    console.error("Erreur PUT /api/admin/produit:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      id: request.nextUrl.searchParams.get("id"),
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      console.error("Missing product ID in DELETE request");
      return NextResponse.json({ error: "ID du produit requis" }, { status: 400 });
    }

    const produit = await db.produit.findUnique({ where: { id } });
    if (!produit) {
      console.error("Product not found:", id);
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    const hasOrders = await db.commandeProduit.findFirst({ where: { produitId: id } });
    const hasDemands = await db.demandeProduit.findFirst({ where: { produitId: id } });

    

    await db.$transaction([
      db.alerte.deleteMany({ where: { produitId: id } }),
      db.produitFournisseur.deleteMany({ where: { produitId: id } }),
      db.registreProduit.deleteMany({ where: { produitId: id } }),
      db.produit.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: "Produit supprimé avec succès" }, { status: 200 });
  } catch (error) {
    console.error("Erreur DELETE /api/admin/produit:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      id: request.nextUrl.searchParams.get("id"),
    });
    return NextResponse.json(
      { error: "Erreur lors de la suppression du produit" },
      { status: 500 }
    );
  }
}
