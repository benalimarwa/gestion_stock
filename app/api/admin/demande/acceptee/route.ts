import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// Enum for valid demande statuses
const VALID_STATUSES = ["EN_ATTENTE", "APPROUVEE", "REJETEE"] as const;
type DemandeStatus = typeof VALID_STATUSES[number];

// GET handler for /api/admin/demande/acceptee (fetch all) and /api/admin/demande/acceptee?id=[id] (fetch one)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    // Authenticate the user
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Find the user and ensure they are an admin
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Utilisateur non trouvé ou non admin" }, { status: 403 });
    }

    if (id) {
      // Fetch a single demande by id
      const demande = await prisma.demande.findUnique({
        where: {
          id: String(id),
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
                select: { name: true, email: true },
              },
            },
          },
        },
      });

      if (!demande) {
        return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
      }

      // Ensure the demande is APPROUVEE or EN_ATTENTE
      if (demande.statut !== "APPROUVEE" && demande.statut !== "EN_ATTENTE") {
        return NextResponse.json({ error: "Demande non autorisée" }, { status: 403 });
      }

      // Format the response
      const formattedDemande = {
        id: demande.id,
        statut: demande.statut,
        createdAt: demande.createdAt.toISOString(),
        demandeur: {
          user: {
            name: demande.demandeur?.user?.name || "Inconnu",
            email: demande.demandeur?.user?.email || "N/A",
          },
        },
        details: demande.produits
          .filter((dp) => dp.produit !== null)
          .map((dp) => ({
            nom: dp.produit?.nom || "Produit inconnu",
            description: dp.produit?.remarque || `Quantité: ${dp.quantite}`,
          })),
      };

      return NextResponse.json(formattedDemande, { status: 200 });
    } else {
      // Fetch all demandes with status APPROUVEE or EN_ATTENTE
      console.log("Fetching demandes with status APPROUVEE or EN_ATTENTE...");
      const demandes = await prisma.demande.findMany({
        where: {
          statut: { in: ["APPROUVEE"] },
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
                select: { name: true, email: true },
              },
            },
          },
        },
      });

      // Format the responses
      const formattedDemandes = demandes.map((demande) => ({
        id: demande.id,
        statut: demande.statut,
        createdAt: demande.createdAt.toISOString(),
        demandeur: {
          user: {
            name: demande.demandeur?.user?.name || "Inconnu",
            email: demande.demandeur?.user?.email || "N/A",
          },
        },
        details: demande.produits
          .filter((dp) => dp.produit !== null)
          .map((dp) => ({
            nom: dp.produit?.nom || "Produit inconnu",
            description: dp.produit?.remarque || `Quantité: ${dp.quantite}`,
          })),
      }));

      console.log("Found demandes:", formattedDemandes.length, "items:", formattedDemandes);
      return NextResponse.json(formattedDemandes, { status: 200 });
    }
  } catch (error) {
    console.error(`Erreur dans /api/admin/demande/acceptee${id ? `?id=${id}` : ""}:`, error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}

// PATCH handler for /api/admin/demande/acceptee?id=[id] (update status to EN_ATTENTE, APPROUVEE, or REJETEE)
export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  try {
    // Authenticate the user
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Find the user and ensure they are an admin
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Utilisateur non trouvé ou non admin" }, { status: 403 });
    }

    const { statut, rejectionReason } = await request.json();

    // Validate status
    if (!VALID_STATUSES.includes(statut)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    // Verify the demande exists
    const demande = await prisma.demande.findUnique({
      where: { id: String(id) },
    });

    if (!demande) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      statut: statut as DemandeStatus,
      updatedAt: new Date(),
    };

    if (statut === "APPROUVEE") {
      // Ensure current status is EN_ATTENTE
      if (demande.statut !== "EN_ATTENTE") {
        return NextResponse.json({ error: "La demande n'est pas en attente" }, { status: 400 });
      }
      updateData.adminId = user.id;
      updateData.dateApprouvee = new Date();
      updateData.raisonRefus = null;
    } else if (statut === "REJETEE") {
      // Ensure current status is EN_ATTENTE
      if (demande.statut !== "EN_ATTENTE") {
        return NextResponse.json({ error: "La demande n'est pas en attente" }, { status: 400 });
      }
      if (!rejectionReason || !rejectionReason.trim()) {
        return NextResponse.json({ error: "Motif de rejet requis" }, { status: 400 });
      }
      updateData.adminId = user.id;
      updateData.raisonRefus = rejectionReason.trim();
      updateData.dateApprouvee = null;
    } else if (statut === "EN_ATTENTE") {
      // Ensure current status is APPROUVEE and approved by this admin
      if (demande.statut !== "APPROUVEE") {
        return NextResponse.json({ error: "La demande n'est pas approuvée" }, { status: 400 });
      }
      if (demande.adminId !== user.id) {
        return NextResponse.json({ error: "La demande n'est pas approuvée par cet admin" }, { status: 403 });
      }
      updateData.adminId = null;
      updateData.dateApprouvee = null;
      updateData.raisonRefus = null;
    }

    // Update the demande
    const updatedDemande = await prisma.demande.update({
      where: { id: String(id) },
      data: updateData,
      include: {
        demandeur: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
        produits: {
          include: {
            produit: {
              select: { nom: true, remarque: true },
            },
          },
        },
      },
    });

    // Format response to match frontend expectations
    const formattedDemande = {
      id: updatedDemande.id,
      statut: updatedDemande.statut,
      createdAt: updatedDemande.createdAt.toISOString(),
      demandeur: {
        user: {
          name: updatedDemande.demandeur?.user?.name || "Inconnu",
          email: updatedDemande.demandeur?.user?.email || "N/A",
        },
      },
      details: updatedDemande.produits
        .filter((dp) => dp.produit !== null)
        .map((dp) => ({
          nom: dp.produit?.nom || "Produit inconnu",
          description: dp.produit?.remarque || `Quantité: ${dp.quantite}`,
        })),
    };

    return NextResponse.json(formattedDemande, { status: 200 });
  } catch (error) {
    console.error(`Erreur dans /api/admin/demande/acceptee?id=${id}:`, error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}
