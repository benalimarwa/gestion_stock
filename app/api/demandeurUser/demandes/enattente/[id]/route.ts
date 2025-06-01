import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { StatutDemande, StatutDemandeExceptionnelle } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    const demandeur = await prisma.demandeur.findUnique({
      where: { userId: dbUser.id },
    });

    if (!demandeur) {
      console.error("No Demandeur record found for user:", dbUser.id);
      return NextResponse.json(
        { error: "Aucun profil demandeur associé à cet utilisateur" },
        { status: 404 }
      );
    }

    const demande = await prisma.demande.findUnique({
      where: {
        id,
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
    });

    if (demande) {
      console.log("Regular request fetched:", id);
      return NextResponse.json({ ...demande, type: "REGULIERE" });
    }

    const demandeExceptionnelle = await prisma.demandeExceptionnelle.findUnique({
      where: {
        id,
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
    });

    if (demandeExceptionnelle) {
      console.log("Exceptional request fetched:", id);
      return NextResponse.json({ ...demandeExceptionnelle, type: "EXCEPTIONNELLE" });
    }

    console.error("Request not found or not pending:", id);
    return NextResponse.json({ error: "Demande non trouvée ou non en attente" }, { status: 404 });
  } catch (error: any) {
    console.error("Erreur lors de la récupération de la demande:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération de la demande", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string } >}) {
  try {
    const { id } =await  params;
    const { produits, produitsExceptionnels, type } = await req.json();
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

    const demandeur = await prisma.demandeur.findUnique({
      where: { userId: dbUser.id },
    });

    if (!demandeur) {
      console.error("No Demandeur record found for user:", dbUser.id);
      return NextResponse.json(
        { error: "Aucun profil demandeur associé à cet utilisateur" },
        { status: 404 }
      );
    }

    if (type === "REGULIERE") {
      const existingDemande = await prisma.demande.findUnique({
        where: {
          id,
          demandeurId: demandeur.id,
          statut: StatutDemande.EN_ATTENTE,
        },
      });

      if (!existingDemande) {
        console.error("Regular request not found or not pending:", id);
        return NextResponse.json({ error: "Demande non trouvée ou non en attente" }, { status: 404 });
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
      }

      await prisma.demandeProduit.deleteMany({
        where: {
          demandeId: id,
        },
      });

      const updatedDemande = await prisma.demande.update({
        where: {
          id,
        },
        data: {
          updatedAt: new Date(),
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

      console.log("Regular request updated:", id);
      return NextResponse.json({ ...updatedDemande, type: "REGULIERE" });
    } else if (type === "EXCEPTIONNELLE") {
      const existingDemandeExceptionnelle = await prisma.demandeExceptionnelle.findUnique({
        where: {
          id,
          demandeurId: demandeur.id,
          statut: StatutDemandeExceptionnelle.EN_ATTENTE,
        },
      });

      if (!existingDemandeExceptionnelle) {
        console.error("Exceptional request not found or not pending:", id);
        return NextResponse.json({ error: "Demande exceptionnelle non trouvée ou non en attente" }, { status: 404 });
      }

      if (produitsExceptionnels && Array.isArray(produitsExceptionnels)) {
        for (const prod of produitsExceptionnels) {
          if (!prod.name || prod.quantite <= 0) {
            console.error("Invalid exceptional product data:", prod);
            return NextResponse.json({ error: "Données de produit exceptionnel invalides" }, { status: 400 });
          }
          if (!prod.produitExceptionnelId) {
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
        }
      }

      await prisma.demandeProduitExceptionnel.deleteMany({
        where: {
          demandeExceptionnelleId: id,
        },
      });

      const updatedDemandeExceptionnelle = await prisma.demandeExceptionnelle.update({
        where: {
          id,
        },
        data: {
          updatedAt: new Date(),
          produitsExceptionnels: {
            create: produitsExceptionnels.map((prod: any) => ({
              produitExceptionnel: prod.produitExceptionnelId
                ? { connect: { id: prod.produitExceptionnelId } }
                : {
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

      console.log("Exceptional request updated:", id);
      return NextResponse.json({ ...updatedDemandeExceptionnelle, type: "EXCEPTIONNELLE" });
    }

    return NextResponse.json({ error: "Type de demande invalide" }, { status: 400 });
  } catch (error: any) {
    console.error("Erreur lors de la mise à jour de la demande:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour de la demande", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } =await params;
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

    const demandeur = await prisma.demandeur.findUnique({
      where: { userId: dbUser.id },
    });

    if (!demandeur) {
      console.error("No Demandeur record found for user:", dbUser.id);
      return NextResponse.json(
        { error: "Aucun profil demandeur associé à cet utilisateur" },
        { status: 404 }
      );
    }

    const existingDemande = await prisma.demande.findUnique({
      where: {
        id,
        demandeurId: demandeur.id,
        statut: StatutDemande.EN_ATTENTE,
      },
    });

    if (existingDemande) {
      await prisma.demande.delete({
        where: {
          id,
        },
      });

      console.log("Regular request deleted:", id);
      return NextResponse.json({ success: true, type: "REGULIERE" });
    }

    const existingDemandeExceptionnelle = await prisma.demandeExceptionnelle.findUnique({
      where: {
        id,
        demandeurId: demandeur.id,
        statut: StatutDemandeExceptionnelle.EN_ATTENTE,
      },
    });

    if (existingDemandeExceptionnelle) {
      await prisma.demandeExceptionnelle.delete({
        where: {
          id,
        },
      });

      console.log("Exceptional request deleted:", id);
      return NextResponse.json({ success: true, type: "EXCEPTIONNELLE" });
    }

    console.error("Request not found or not pending:", id);
    return NextResponse.json({ error: "Demande non trouvée ou non en attente" }, { status: 404 });
  } catch (error: any) {
    console.error("Erreur lors de la suppression de la demande:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      { error: "Erreur serveur lors de la suppression de la demande", details: error.message },
      { status: 500 }
    );
  }
}