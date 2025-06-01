import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const [demandesEnAttente, demandesExceptionnellesEnAttente] = await Promise.all([
      prisma.demande.findMany({
        where: { statut: "EN_ATTENTE" },
        include: {
          demandeur: {
            include: { user: { select: { email: true, name: true } } },
          },
          produits: {
            include: {
              produit: { select: { nom: true, marque: true } },
            },
          },
        },
      }),
      prisma.demandeExceptionnelle.findMany({
        where: { statut: "EN_ATTENTE" },
        include: {
          demandeur: {
            include: { user: { select: { email: true, name: true } } },
          },
          produitsExceptionnels: {
            include: {
              produitExceptionnel: { select: { name: true, marque: true } },
            },
          },
        },
      }),
    ]);

    const notifications = [
      ...demandesEnAttente.map((demande) => ({
        id: `demande-${demande.id}`,
        message: `Demande en attente de ${demande.demandeur.user.name || demande.demandeur.user.email}`,
        dateEnvoi: demande.createdAt.toISOString(),
        type: "DEMANDE",
        source: `Demande #${demande.id}`,
        demandeId: demande.id,
        user: { email: demande.demandeur.user.email },
        produits: demande.produits.map((p) => ({
          produit: { nom: p.produit.nom, marque: p.produit.marque },
          quantite: p.quantite,
        })),
      })),
      ...demandesExceptionnellesEnAttente.map((demande) => ({
        id: `demande-exceptionnelle-${demande.id}`,
        message: `Demande exceptionnelle en attente de ${demande.demandeur.user.name || demande.demandeur.user.email}`,
        dateEnvoi: demande.createdAt.toISOString(),
        type: "DEMANDE_EXCEPTIONNELLE",
        source: `Demande Exceptionnelle #${demande.id}`,
        demandeExceptionnelleId: demande.id,
        user: { email: demande.demandeur.user.email },
        produits: demande.produitsExceptionnels.map((p) => ({
          produit: { nom: p.produitExceptionnel.name, marque: p.produitExceptionnel.marque || "Inconnu" },
          quantite: p.quantite,
        })),
      })),
    ];

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Erreur dans GET /api/notifications/notif:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    // Pas de suppression réelle dans la table Notification car les notifications sont générées dynamiquement
    return NextResponse.json({ message: "Notification supprimée" });
  } catch (error) {
    console.error("Erreur dans DELETE /api/notifications/notif:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}