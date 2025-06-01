import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { Role, StatutDemande, StatutDemandeExceptionnelle, Demande, DemandeProduit, Produit, DemandeExceptionnelle, DemandeProduitExceptionnel, ProduitExceptionnel } from "@prisma/client";

// Define type for Demande with included produits
type DemandeWithProduitsEnAttente = Demande & {
  produits: (DemandeProduit & {
    produit: {
      id: string;
      nom: string;
      quantite: number;
      marque: string | null;
    };
  })[];
};

// Define type for DemandeExceptionnelle with included produitsExceptionnels
type DemandeExceptionnelleWithProduitsEnAttente = DemandeExceptionnelle & {
  produitsExceptionnels: (DemandeProduitExceptionnel & {
    produitExceptionnel: {
      id: string;
      name: string;
      marque: string | null;
      description: string | null;
    };
  })[];
};

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      console.error("No authenticated user found");
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
    });

    if (!dbUser) {
      console.error("User not found:", user.id);
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    if (dbUser.role !== Role.DEMANDEUR) {
      console.error("User does not have DEMANDEUR role:", dbUser.id);
      return NextResponse.json(
        { error: "Accès non autorisé. Vous devez être un demandeur." },
        { status: 403 }
      );
    }

    const demandeur = await prisma.demandeur.findUnique({
      where: { userId: dbUser.id },
    });

    if (!demandeur) {
      console.log("No Demandeur record found for user:", dbUser.id);
      return NextResponse.json([]);
    }

    const demandes = await prisma.demande.findMany({
      where: {
        demandeurId: demandeur.id,
        statut: StatutDemande.EN_ATTENTE,
      },
      include: {
        produits: {
          include: {
            produit: {
              select: {
                id: true,
                nom: true,
                quantite: true,
                marque: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const demandesExceptionnelles = await prisma.demandeExceptionnelle.findMany({
      where: {
        demandeurId: demandeur.id,
        statut: StatutDemandeExceptionnelle.EN_ATTENTE,
      },
      include: {
        produitsExceptionnels: {
          include: {
            produitExceptionnel: {
              select: {
                id: true,
                name: true,
                marque: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const combinedDemandes = [
      ...demandes.map((demande: DemandeWithProduitsEnAttente) => ({
        ...demande,
        type: "REGULIERE",
        produitsExceptionnels: [],
      })),
      ...demandesExceptionnelles.map((demande: DemandeExceptionnelleWithProduitsEnAttente) => ({
        ...demande,
        type: "EXCEPTIONNELLE",
        produits: [],
        statut: demande.statut, // Keep the exceptional status
      })),
    ];

    console.log("Pending requests fetched:", combinedDemandes.length);
    return NextResponse.json(combinedDemandes);
  } catch (error: any) {
    console.error("Erreur lors de la récupération des demandes en attente:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des demandes", details: error.message },
      { status: 500 }
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    const { produits, produitsExceptionnels } = await req.json();
    if (
      (!produits || !Array.isArray(produits) || produits.length === 0) &&
      (!produitsExceptionnels || !Array.isArray(produitsExceptionnels) || produitsExceptionnels.length === 0)
    ) {
      console.error("Invalid data: both produits and produitsExceptionnels are empty or invalid");
      return NextResponse.json(
        { error: "Il faut au moins un produit ou un produit exceptionnel" },
        { status: 400 }
      );
    }

    const user = await currentUser();
    if (!user) {
      console.error("No authenticated user found");
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
    });

    if (!dbUser) {
      console.error("User not found:", user.id);
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    if (dbUser.role !== Role.DEMANDEUR) {
      console.error("User does not have DEMANDEUR role:", dbUser.id);
      return NextResponse.json(
        { error: "Accès non autorisé. Vous devez être un demandeur." },
        { status: 403 }
      );
    }

    const demandeur = await prisma.demandeur.findUnique({
      where: { userId: dbUser.id },
    });

    // Add this null check - this was missing!
    if (!demandeur) {
      console.error("No Demandeur record found for user:", dbUser.id);
      return NextResponse.json(
        { error: "Profil demandeur non trouvé" },
        { status: 404 }
      );
    }

    if (produits && Array.isArray(produits)) {
      for (const prod of produits) {
        if (!prod.produitId || prod.quantite <= 0) {
          console.error("Invalid product data:", prod);
          return NextResponse.json({ error: "Données de produit invalides" }, { status: 400 });
        }
        const product = await prisma.produit.findUnique({
          where: { id: prod.produitId },
        });
        if (!product || product.quantite < prod.quantite) {
          console.error("Product not found or insufficient quantity:", prod);
          return NextResponse.json(
            { error: `Produit ${prod.produitId} indisponible ou quantité insuffisante` },
            { status: 400 }
          );
        }
      }

      const demande = await prisma.demande.create({
        data: {
          demandeur: { connect: { id: demandeur.id } },
          statut: StatutDemande.EN_ATTENTE,
          produits: {
            create: produits.map((prod: any) => ({
              produitId: prod.produitId,
              quantite: prod.quantite,
            })),
          },
        },
        include: {
          produits: {
            include: {
              produit: {
                select: {
                  id: true,
                  nom: true,
                  quantite: true,
                  marque: true,
                },
              },
            },
          },
        },
      });

      console.log("Regular request created:", demande.id);
      return NextResponse.json({ ...demande, type: "REGULIERE" });
    }

    if (produitsExceptionnels && Array.isArray(produitsExceptionnels)) {
      for (const prod of produitsExceptionnels) {
        if (!prod.name || prod.quantite <= 0) {
          console.error("Invalid exceptional product data:", prod);
          return NextResponse.json({ error: "Données de produit exceptionnel invalides" }, { status: 400 });
        }
        const existingProduitExceptionnel = await prisma.produitExceptionnel.findFirst({
          where: {
            name: prod.name,
            marque: prod.marque || null,
          },
        });
        if (existingProduitExceptionnel) {
          console.error("Exceptional product already exists:", prod);
          return NextResponse.json(
            { error: `Produit exceptionnel '${prod.name}' avec marque '${prod.marque || "Inconnu"}' existe déjà` },
            { status: 400 }
          );
        }
      }

      const demandeExceptionnelle = await prisma.demandeExceptionnelle.create({
        data: {
          demandeur: { connect: { id: demandeur.id } },
          statut: StatutDemandeExceptionnelle.EN_ATTENTE,
          produitsExceptionnels: {
            create: produitsExceptionnels.map((prod: any) => ({
              produitExceptionnel: {
                create: {
                  name: prod.name,
                  marque: prod.marque || null,
                  description: prod.description || null,
                },
              },
              quantite: prod.quantite,
            })),
          },
        },
        include: {
          produitsExceptionnels: {
            include: {
              produitExceptionnel: {
                select: {
                  id: true,
                  name: true,
                  marque: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      console.log("Exceptional request created:", demandeExceptionnelle.id);
      return NextResponse.json({ ...demandeExceptionnelle, type: "EXCEPTIONNELLE" });
    }
  } catch (error: any) {
    console.error("Erreur lors de la création de la demande:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Erreur serveur lors de la création de la demande", details: error.message },
      { status: 500 }
    );
  }
}