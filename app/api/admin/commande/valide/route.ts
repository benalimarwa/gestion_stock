import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// Helper function to safely extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Une erreur inconnue s\'est produite';
}

// GET handler for /api/admin/commande/non-valide (fetch all) and /api/admin/commande/non-valide?id=[id] (fetch one)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id"); // Extract id from query params

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
      // Fetch a single commande by id - Use findUnique instead of findMany
      const commande = await prisma.commande.findUnique({
        where: { id: String(id) }, // Add the where clause for specific ID
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

      // Ensure the command is either NON_VALIDE or was validated by this admin
      if (commande.statut === "NON_VALIDE" || (commande.statut === "VALIDE")) {
        return NextResponse.json(commande, { status: 200 });
      } else {
        return NextResponse.json({ error: "Commande non autorisée" }, { status: 403 });
      }
    } else {
      // Fetch all commandes with status NON_VALIDE (not validated yet)
      console.log("Fetching commandes with status NON_VALIDE...");
      const commandesNonValide = await prisma.commande.findMany({
        where: {
          statut: "NON_VALIDE",
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

      // Fetch all commandes with status VALIDE that were validated by the current admin
      console.log("Fetching commandes with status VALIDE for admin...");
      const commandesValide = await prisma.commande.findMany({
        where: {
          statut: "VALIDE",
          adminId: user.id, // Filter by the admin who validated the command
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

      console.log("Found NON_VALIDE commandes:", commandesNonValide.length, "items:", commandesNonValide);
      console.log("Found VALIDE commandes:", commandesValide.length, "items:", commandesValide);

      // Combine the results into a single response
      return NextResponse.json(
        {
          nonValide: commandesNonValide,
          valide: commandesValide,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error(`Erreur dans /api/admin/commande/non-valide${id ? `?id=${id}` : ""}:`, error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}

// PATCH handler for /api/admin/commande/non-valide?id=[id] (update status to VALIDE)
export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id"); // Extract id from query params

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

    const { statut } = await request.json();

    // Ensure the provided status is "VALIDE"
    if (statut !== "VALIDE") {
      return NextResponse.json({ error: "Statut invalide, doit être VALIDE" }, { status: 400 });
    }

    // Verify the commande exists and is NON_VALIDE
    const commande = await prisma.commande.findUnique({
      where: { id: String(id) },
    });

    if (!commande) {
      return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 });
    }

    if (commande.statut !== "NON_VALIDE") {
      return NextResponse.json({ error: "La commande n'est pas non validée" }, { status: 400 });
    }

    // Update the commande to VALIDE and set adminId
    const updatedCommande = await prisma.commande.update({
      where: { id: String(id) },
      data: {
        statut: "VALIDE",
        adminId: user.id, // Set the adminId to the authenticated user
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

    return NextResponse.json(updatedCommande, { status: 200 });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error(`Erreur dans /api/admin/commande/non-valide?id=${id}:`, error);
    return NextResponse.json({ 
      error: "Erreur serveur interne", 
      details: errorMessage 
    }, { status: 500 });
  }
}