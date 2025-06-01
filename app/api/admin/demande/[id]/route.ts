import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { action, rejectionReason } = await request.json();
    // Await the params in Next.js 15
    const { id: demandeId } = await params;

    if (!["ACCEPT", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    const demande = await prisma.demande.findUnique({
      where: { id: demandeId },
      include: { demandeur: { include: { user: true } } },
    });

    if (!demande) {
      return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    }

    if (action === "ACCEPT") {
      // Update demande status to APPROUVEE
      await prisma.demande.update({
        where: { id: demandeId },
        data: { statut: "APPROUVEE" },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: demande.demandeur.user.id,
          message: `Votre demande #${demandeId.slice(0, 8)} a été approuvée.`,
        },
      });

      return NextResponse.json({ message: "Demande approuvée" }, { status: 200 });
    } else if (action === "REJECT") {
      if (!rejectionReason || typeof rejectionReason !== "string" || rejectionReason.trim() === "") {
        return NextResponse.json({ error: "Motif de rejet requis" }, { status: 400 });
      }

      // Update demande status to REJETEE and save rejection reason
      await prisma.demande.update({
        where: { id: demandeId },
        data: {
          statut: "REJETEE",
          raisonRefus: rejectionReason.trim(),
        },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: demande.demandeur.user.id,
          message: `Votre demande #${demandeId.slice(0, 8)} a été rejetée. Motif: ${rejectionReason.trim()}`,
        },
      });

      return NextResponse.json({ message: "Demande rejetée" }, { status: 200 });
    }
  } catch (error) {
    console.error(`Erreur dans /api/admin/demande/action:`, error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}