import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

// Define proper types for the request body
interface ProductItem {
  produitId?: string;
  id?: string;
  quantite: number;
}

interface CreateOrderBody {
  fournisseurId: string;
  produits: ProductItem[];
  sourceOrderId?: string;
  datePrevu: string;
}

// Type for admin notification
interface AdminUser {
  id: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    
    const dbUser = await prisma.user.findUnique({ where: { clerkUserId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (dbUser.role !== "GESTIONNAIRE") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body: CreateOrderBody = await request.json();
    const { fournisseurId, produits, sourceOrderId, datePrevu } = body;
    console.log("Received data:", { fournisseurId, produits, sourceOrderId, datePrevu });

    if (!fournisseurId || !produits || !Array.isArray(produits) || produits.length === 0 || !datePrevu) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const fournisseur = await prisma.fournisseur.findUnique({ where: { id: fournisseurId } });
    if (!fournisseur) return NextResponse.json({ error: `Fournisseur avec ID ${fournisseurId} non trouvé` }, { status: 400 });

    for (const item of produits) {
      const produit = await prisma.produit.findUnique({ where: { id: item.produitId || item.id } });
      if (!produit) return NextResponse.json({ error: `Produit avec ID ${item.produitId || item.id} non trouvé` }, { status: 400 });
      if (!item.quantite || item.quantite <= 0) return NextResponse.json({ error: `La quantité pour le produit ${produit.nom} doit être supérieure à 0` }, { status: 400 });
    }

    const commande = await prisma.commande.create({
      data: {
        fournisseurId,
        statut: "EN_COURS",
        date: new Date(),
        datePrevu,
        gestionnaireId: dbUser.id,
        produits: { 
          create: produits.map((item: ProductItem) => ({ 
            produitId: item.produitId || item.id!, // Using non-null assertion since we validated above
            quantite: item.quantite 
          })) 
        },
      },
      include: { 
        produits: { include: { produit: true } }, 
        gestionnaire: { select: { name: true } }, 
        fournisseur: true 
      },
    });

    if (sourceOrderId) {
      const productIds = produits.map((p: ProductItem) => p.produitId || p.id!);
      console.log("Updating products as reordered:", { sourceOrderId, productIds });
      try { 
        await prisma.commandeProduit.updateMany({ 
          where: { 
            commandeId: sourceOrderId, 
            produitId: { in: productIds } 
          }, 
          data: { reordered: true } 
        }); 
      } catch (error) { 
        console.error("Error updating reordered status:", error); 
      }
    }

    const admins = await prisma.user.findMany({ 
      where: { role: "ADMIN" }, 
      select: { id: true } 
    });
    
    await prisma.notification.createMany({ 
      data: admins.map((admin: AdminUser) => ({ 
        userId: admin.id, 
        message: `New order created by Gestionnaire ${dbUser.name || "unknown"} (ID: ${commande.id}) for supplier ID: ${fournisseurId}`, 
        typeEnvoi: "SYSTEM" 
      })) 
    });

    return NextResponse.json(commande, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ 
      error: "Failed to create order: " + (error instanceof Error ? error.message : "Unknown error") 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Find the user in our database
    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is a GESTIONNAIRE
    if (dbUser.role !== "GESTIONNAIRE") {
      return NextResponse.json(
        { error: "Unauthorized. Only gestionnaires can view their passed commands." },
        { status: 403 }
      );
    }

    // Fetch commands filtered by gestionnaireId
    const commandes = await prisma.commande.findMany({
      where: {
        gestionnaireId: dbUser.id, // Filter by the gestionnaire who passed the command
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
        gestionnaire: {
          select: {
            name: true,
          },
        },
        admin: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(commandes, { status: 200 });
  } catch (error) {
    console.error("Error fetching commands:", error);
    return NextResponse.json(
      {
        error:
          "Failed to fetch commands: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}