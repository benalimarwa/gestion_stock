import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { Role, StatutDemande, StatutDemandeExceptionnelle } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params:Promise< { id: string }> }
) {
  try {
       const { id: requestId } = await params;

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
      console.error("No Demandeur record found for user:", dbUser.id);
      return NextResponse.json(
        { error: "Aucun profil demandeur associé à cet utilisateur" },
        { status: 404 }
      );
    }

    const demande = await prisma.demande.findUnique({
      where: {
        id: requestId,
        demandeurId: demandeur.id,
        statut: StatutDemande.APPROUVEE,
      },
      include: {
        produits: {
          include: {
            produit: {
              select: {
                id: true,
                nom: true, // Corrected from 'name' to 'nom'
                quantite: true,
                marque: true,
              },
            },
          },
        },
      },
    });

    if (demande) {
      console.log("Approved regular request fetched:", requestId);
      return NextResponse.json({ ...demande, type: "REGULIERE", produitsExceptionnels: [] });
    }

    const demandeExceptionnelle = await prisma.demandeExceptionnelle.findUnique({
      where: {
        id: requestId,
        demandeurId: demandeur.id,
        statut: {
          in: [
            StatutDemandeExceptionnelle.ACCEPTEE,
            StatutDemandeExceptionnelle.COMMANDEE,
            StatutDemandeExceptionnelle.LIVREE,
          ],
        },
      },
      include: {
        produitsExceptionnels: {
          include: {
            produitExceptionnel: {
              select: {
                id: true,
                name: true, // Correct for ProduitExceptionnel
                marque: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (demandeExceptionnelle) {
      console.log("Approved exceptional request fetched:", requestId);
      return NextResponse.json({ ...demandeExceptionnelle, type: "EXCEPTIONNELLE", produits: [] });
    }

    console.error("Request not found or not approved:", requestId);
    return NextResponse.json(
      { error: "Demande non trouvée ou non approuvée" },
      { status: 404 }
    );
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