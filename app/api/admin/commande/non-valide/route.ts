import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

// Define type for CommandeProduit with nested Produit
type CommandeProduitWithProduit = Prisma.CommandeProduitGetPayload<{
  include: {
    produit: {
      select: { nom: true };
    };
  };
}>;

// Define type for Commande with relations
type CommandeWithRelations = Prisma.CommandeGetPayload<{
  include: {
    produits: {
      include: {
        produit: {
          select: { nom: true };
        };
      };
    };
  };
}>;

// GET handler for /api/admin/commande/non-valide (fetch all) and /api/admin/commande/non-valide?id=[id]
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    // Authenticate the user
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Utilisateur non trouvé ou non admin" }, { status: 403 });
    }

    if (id) {
      // Fetch a single commande by id
      const commande: CommandeWithRelations | null = await prisma.commande.findUnique({
        where: { id: String(id) },
        include: {
          produits: {
            include: {
              produit: {
                select: { nom: true },
              },
            },
          },
        },
      });

      if (!commande) {
        return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 });
      }

      // Format the response
      const formattedCommande = {
        id: commande.id,
        statut: commande.statut,
        date: commande.date.toISOString(),
        createdAt: commande.createdAt.toISOString(),
        produits: commande.produits
          .filter((cp: CommandeProduitWithProduit) => cp.produit !== null)
          .map((cp: CommandeProduitWithProduit) => ({
            produit: {
              nom: cp.produit.nom || "Produit inconnu",
            },
            quantite: cp.quantite,
          })),
      };

      return NextResponse.json(formattedCommande, { status: 200 });
    } else {
      // Fetch all commandes with status VALIDE or NON_VALIDE
      const commandes: CommandeWithRelations[] = await prisma.commande.findMany({
        where: {
          statut: { in: ["VALIDE", "NON_VALIDE"] },
        },
        include: {
          produits: {
            include: {
              produit: {
                select: { nom: true },
              },
            },
          },
        },
      });

      // Format the responses
      const formattedCommandes = {
        nonValide: commandes
          .filter((c) => c.statut === "NON_VALIDE")
          .map((commande) => ({
            id: commande.id,
            statut: commande.statut,
            date: commande.date.toISOString(),
            createdAt: commande.createdAt.toISOString(),
            produits: commande.produits
              .filter((cp: CommandeProduitWithProduit) => cp.produit !== null)
              .map((cp: CommandeProduitWithProduit) => ({
                produit: {
                  nom: cp.produit.nom || "Produit inconnu",
                },
                quantite: cp.quantite,
              })),
          })),
        valide: commandes
          .filter((c) => c.statut === "VALIDE")
          .map((commande) => ({
            id: commande.id,
            statut: commande.statut,
            date: commande.date.toISOString(),
            createdAt: commande.createdAt.toISOString(),
            produits: commande.produits
              .filter((cp: CommandeProduitWithProduit) => cp.produit !== null)
              .map((cp: CommandeProduitWithProduit) => ({
                produit: {
                  nom: cp.produit.nom || "Produit inconnu",
                },
                quantite: cp.quantite,
              })),
          })),
      };

      return NextResponse.json(formattedCommandes, { status: 200 });
    }
  } catch (error) {
    console.error(`Erreur dans /api/admin/commande/non-valide${id ? `?id=${id}` : ""}:`, error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}
export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  console.log("PATCH /api/admin/commande/non-valide - Commande ID:", id);

  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  try {
    const { userId } = auth();
    console.log("PATCH /api/admin/commande/non-valide - User ID:", userId);
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });
    console.log("PATCH /api/admin/commande/non-valide - User found:", user);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Utilisateur non trouvé ou non admin" }, { status: 403 });
    }

    const body = await request.json();
    console.log("PATCH /api/admin/commande/non-valide - Request body:", body);
    const { statut } = body;

    if (statut !== "VALIDE" && statut !== "NON_VALIDE") {
      return NextResponse.json({ error: "Statut invalide, doit être VALIDE ou NON_VALIDE" }, { status: 400 });
    }

    const commande = await prisma.commande.findUnique({
      where: { id: String(id) },
    });
    console.log("PATCH /api/admin/commande/non-valide - Commande found:", commande);
    if (!commande) {
      return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 });
    }

    if (statut === "VALIDE" && commande.statut !== "NON_VALIDE") {
      return NextResponse.json({ error: "La commande n'est pas non validée" }, { status: 400 });
    }
    if (statut === "NON_VALIDE" && commande.statut !== "VALIDE") {
      return NextResponse.json({ error: "La commande n'est pas validée" }, { status: 400 });
    }

    const updatedCommande = await prisma.commande.update({
      where: { id: String(id) },
      data: {
        statut: statut,
        adminId: statut === "VALIDE" ? user.id : null,
        updatedAt: new Date(),
      },
      include: {
        produits: {
          include: {
            produit: {
              select: { nom: true },
            },
          },
        },
      },
    });
    console.log("PATCH /api/admin/commande/non-valide - Updated commande:", updatedCommande);

    return NextResponse.json(updatedCommande, { status: 200 });
  } catch (error) {
    console.error("Erreur dans /api/admin/commande/non-valide:", {
     
      error,
    });
    return NextResponse.json(
      { error: "Erreur serveur interne"},
      { status: 500 }
    );
  }
}