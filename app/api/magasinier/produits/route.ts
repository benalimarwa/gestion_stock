import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const produits = await prisma.produit.findMany({
      include: {
        categorie: true,
        fournisseurs: {
          include: {
            fournisseur: {
              select: {
                id: true,
                nom: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Transform the response to flatten the fournisseurs structure
    const transformedProduits = produits.map((produit) => ({
      ...produit,
      fournisseurs: produit.fournisseurs.map((pf) => pf.fournisseur),
    }));

    return NextResponse.json(transformedProduits);
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des produits" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Validate required fields
    if (!data.nom?.trim()) {
      return NextResponse.json({ error: "Le nom du produit est requis." }, { status: 400 });
    }
    if (!data.marque?.trim()) {
      return NextResponse.json({ error: "La marque du produit est requise." }, { status: 400 });
    }
    if (!data.categorieId) {
      return NextResponse.json({ error: "L'ID de la catégorie est requis." }, { status: 400 });
    }
    if (!["DURABLE", "CONSOMMABLE"].includes(data.critere)) {
      return NextResponse.json({ error: "Critère invalide. Doit être DURABLE ou CONSOMMABLE." }, { status: 400 });
    }
    if (!["NORMALE", "CRITIQUE", "RUPTURE"].includes(data.statut)) {
      return NextResponse.json({ error: "Statut invalide. Doit être NORMALE, CRITIQUE ou RUPTURE." }, { status: 400 });
    }
    if (typeof data.quantite !== "number" || data.quantite < 0) {
      return NextResponse.json({ error: "Quantité invalide. Doit être un nombre positif." }, { status: 400 });
    }
    if (typeof data.quantiteMinimale !== "number" || data.quantiteMinimale < 0) {
      return NextResponse.json({ error: "Quantité minimale invalide. Doit être un nombre positif." }, { status: 400 });
    }

    // Validate category
    const category = await prisma.categorie.findUnique({
      where: { id: data.categorieId },
    });
    if (!category) {
      return NextResponse.json({ error: "Catégorie non trouvée." }, { status: 400 });
    }

    // Validate suppliers if provided
    if (data.fournisseurIds && Array.isArray(data.fournisseurIds) && data.fournisseurIds.length > 0) {
      const fournisseurs = await prisma.fournisseur.findMany({
        where: { id: { in: data.fournisseurIds } },
      });
      if (fournisseurs.length !== data.fournisseurIds.length) {
        return NextResponse.json({ error: "Un ou plusieurs fournisseurs non trouvés." }, { status: 400 });
      }
    }

    // Create the product
    const product = await prisma.produit.create({
      data: {
        nom: data.nom.trim(),
        marque: data.marque.trim(),
        quantite: data.quantite,
        quantiteMinimale: data.quantiteMinimale,
        statut: data.statut,
        critere: data.critere,
        remarque: data.remarque?.trim() || null,
        categorieId: data.categorieId,
      },
    });

    // Create ProduitFournisseur records if suppliers are provided
    if (data.fournisseurIds && Array.isArray(data.fournisseurIds) && data.fournisseurIds.length > 0) {
      await prisma.produitFournisseur.createMany({
        data: data.fournisseurIds.map((fournisseurId: string) => ({
          produitId: product.id,
          fournisseurId,
        })),
      });
    }

    // Fetch the created product with its category and suppliers
    const createdProduct = await prisma.produit.findUnique({
      where: { id: product.id },
      include: {
        categorie: true,
        fournisseurs: {
          include: {
            fournisseur: {
              select: {
                id: true,
                nom: true,
              },
            },
          },
        },
      },
    });

    // Transform the response
    const transformedProduct = {
      ...createdProduct,
      fournisseurs: createdProduct?.fournisseurs.map((pf) => pf.fournisseur) || [],
    };

    return NextResponse.json(transformedProduct, { status: 201 });
  } catch (error: any) {
    console.error("Erreur lors de la création du produit:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Un produit avec ce nom et cette marque existe déjà." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Erreur serveur: ${error.message || "Erreur inconnue"}` },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}