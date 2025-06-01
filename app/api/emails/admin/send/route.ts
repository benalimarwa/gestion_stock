import { NextResponse } from "next/server";
import { sendEmail } from "@/utils/mail.utils";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { produitId, produitNom, statut, quantite, quantiteMinimale, adminEmails } = body;

    // Validate required parameters
    if (!produitId || !produitNom || !statut || !adminEmails || !Array.isArray(adminEmails) || adminEmails.length === 0) {
      return NextResponse.json(
        {
          error: "Paramètres manquants : produitId, produitNom, statut, et adminEmails (tableau non vide) sont requis",
        },
        { status: 400 }
      );
    }

    if (!["CRITIQUE", "RUPTURE"].includes(statut)) {
      return NextResponse.json(
        { error: "Statut non valide. Utilisez 'CRITIQUE' ou 'RUPTURE'" },
        { status: 400 }
      );
    }

    const sender = {
      name: "Équipe de Gestion de Stock",
      address: "gestionstockessths@gmail.com",
    };

    const recipients = adminEmails.map((email: string) => ({
      name: "Administrateur ou Magasinier",
      address: email,
    }));

    const subject = `Alerte Stock : ${produitNom} est en ${statut.toLowerCase()}`;
    const message = `
      <h1>Bonjour,</h1>
      <p>Une alerte a été déclenchée pour le produit suivant :</p>
      <ul>
        <li><strong>Produit :</strong> ${produitNom}</li>
        <li><strong>Statut :</strong> ${statut}</li>
        <li><strong>Quantité actuelle :</strong> ${quantite}</li>
        <li><strong>Quantité minimale :</strong> ${quantiteMinimale}</li>
      </ul>
      <p>Veuillez vérifier le stock et prendre les mesures nécessaires.</p>
      <p>Cordialement,<br>L'équipe de Gestion de Stock</p>
      <p>PS : Ceci est un message automatique, merci de ne pas y répondre.</p>
      <p>Pour plus d'informations, visitez notre <a href="https://www.example.com">site web</a>.</p>
    `;

    const emailResult = await sendEmail({
      sender,
      recipients,
      subject,
      message,
    });

    // Create a Notification entry for each admin or magasinier
    await Promise.all(
      adminEmails.map(async (email: string) => {
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (user) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              message: `Alerte : Le produit ${produitNom} (ID: ${produitId.substring(0, 8)}...) est en ${statut.toLowerCase()}. Quantité: ${quantite}.`,
              typeEnvoi: "EMAIL",
              sentByEmail: true,
            },
          });
        }
      })
    );

    return NextResponse.json({
      accepted: emailResult.accepted,
      message: "Notification envoyée aux administrateurs et magasiniers",
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email aux administrateurs et magasiniers :", error);
    return NextResponse.json(
      {
        message: "Impossible d'envoyer l'email aux administrateurs et magasiniers",
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
