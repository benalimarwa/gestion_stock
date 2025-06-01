import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

// Define type for DemandeProduit with nested Produit
type DemandeProduitWithProduit = Prisma.DemandeProduitGetPayload<{
  include: {
    produit: {
      select: { nom: true; remarque: true };
    };
  };
}>;

// Define type for Demande with relations (remove admin since it doesn't exist)
type DemandeWithRelations = Prisma.DemandeGetPayload<{
  include: {
    produits: {
      include: {
        produit: {
          select: { nom: true; remarque: true };
        };
      };
    };
    demandeur: {
      include: {
        user: {
          select: { email: true; name: true };
        };
      };
    };
  };
}>;

// GET handler for /api/admin/demande/en-attente (fetch all) and /api/admin/demande/en-attente?id=[id]
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      // Fetch a single demande by id
      const demande: DemandeWithRelations | null = await prisma.demande.findUnique({
        where: { id: String(id) },
        include: {
          produits: {
            include: {
              produit: {
                select: { nom: true, remarque: true },
              },
            },
          },
          demandeur: {
            include: {
              user: {
                select: { email: true, name: true },
              },
            },
          },
        },
      });

      if (!demande) {
        return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
      }

      // Log the raw data for debugging
      console.log("Raw demande data for id", id, ":", JSON.stringify(demande, null, 2));

      // Format the response
      const formattedDemande = {
        id: demande.id,
        statut: demande.statut,
        createdAt: demande.createdAt.toISOString(),
        dateApprouvee: demande.dateApprouvee?.toISOString() || null,
        raisonRefus: demande.raisonRefus || null,
        demandeur: {
          user: {
            name: demande.demandeur?.user?.name || "Inconnu",
            email: demande.demandeur?.user?.email || "Email indisponible",
          },
        },
        produits: demande.produits
          .filter((dp: DemandeProduitWithProduit) => dp.produit !== null)
          .map((dp: DemandeProduitWithProduit) => ({
            produit: {
              nom: dp.produit.nom || "Produit inconnu",
              remarque: dp.produit.remarque || "Aucune remarque",
            },
            quantite: dp.quantite,
          })),
      };

      return NextResponse.json(formattedDemande, { status: 200 });
    } else {
      // Fetch all demandes with status EN_ATTENTE
      console.log("Fetching demandes with status EN_ATTENTE...");
      const demandes: DemandeWithRelations[] = await prisma.demande.findMany({
        where: {
          statut: "EN_ATTENTE",
        },
        include: {
          produits: {
            include: {
              produit: {
                select: { nom: true, remarque: true },
              },
            },
          },
          demandeur: {
            include: {
              user: {
                select: { email: true, name: true },
              },
            },
          },
        },
      });

      // Log the raw data for debugging
      console.log("Raw demandes data:", JSON.stringify(demandes, null, 2));

      // Format the responses
      const formattedDemandes = demandes.map((demande) => ({
        id: demande.id,
        statut: demande.statut,
        createdAt: demande.createdAt.toISOString(),
        dateApprouvee: demande.dateApprouvee?.toISOString() || null,
        raisonRefus: demande.raisonRefus || null,
        demandeur: {
          user: {
            name: demande.demandeur?.user?.name || "Inconnu",
            email: demande.demandeur?.user?.email || "Email indisponible",
          },
        },
        produits: demande.produits
          .filter((dp: DemandeProduitWithProduit) => dp.produit !== null)
          .map((dp: DemandeProduitWithProduit) => ({
            produit: {
              nom: dp.produit.nom || "Produit inconnu",
              remarque: dp.produit.remarque || "Aucune remarque",
            },
            quantite: dp.quantite,
          })),
      }));

      console.log("Found demandes:", formattedDemandes.length, "items:", formattedDemandes);
      return NextResponse.json(formattedDemandes, { status: 200 });
    }
  } catch (error) {
    console.error(`Erreur dans /api/admin/demande/en-attente${id ? `?id=${id}` : ""}:`, error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}

/// PATCH handler (from previous context)
export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Utilisateur non trouvé ou non admin" }, { status: 403 });
    }

    const { statut, dateApprouvee, raisonRefus } = await request.json();

    if (!["APPROUVEE", "REJETEE"].includes(statut)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const demande = await prisma.demande.findUnique({
      where: { id: String(id) },
      include: { demandeur: true, produits: true },
    });

    if (!demande) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    if (demande.statut !== "EN_ATTENTE") {
      return NextResponse.json({ error: "La demande n'est pas en attente" }, { status: 400 });
    }

    const updatedDemande = await prisma.demande.update({
      where: { id: String(id) },
      data: {
        statut,
        dateApprouvee: statut === "APPROUVEE" ? new Date(dateApprouvee || new Date().toISOString()) : null,
        raisonRefus: statut === "REJETEE" ? raisonRefus || "Rejetée par l'administrateur" : null,
        adminId: user.id, // Set the adminId to the authenticated user's ID
        updatedAt: new Date(),
      },
      include: {
        produits: {
          include: {
            produit: {
              select: { nom: true, remarque: true },
            },
          },
        },
        demandeur: {
          include: {
            user: {
              select: { email: true, name: true },
            },
          },
        },
      },
    });

    const formattedDemande = {
      id: updatedDemande.id,
      statut: updatedDemande.statut,
      createdAt: updatedDemande.createdAt.toISOString(),
      dateApprouvee: updatedDemande.dateApprouvee?.toISOString() || null,
      raisonRefus: updatedDemande.raisonRefus || null,
      demandeur: {
        user: {
          name: updatedDemande.demandeur?.user?.name || "Inconnu",
          email: updatedDemande.demandeur?.user?.email || "Email indisponible",
        },
      },
      produits: updatedDemande.produits
        .filter((dp) => dp.produit !== null)
        .map((dp) => ({
          produit: {
            nom: dp.produit.nom || "Produit inconnu",
            remarque: dp.produit.remarque || "Aucune remarque",
          },
          quantite: dp.quantite,
        })),
    };

    return NextResponse.json(formattedDemande, { status: 200 });
  } catch (error) {
    console.error(`Erreur dans /api/admin/demande/en-attente?id=${id}:`, error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}