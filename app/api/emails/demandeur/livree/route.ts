import { NextResponse } from "next/server";
import { sendEmail } from "@/utils/mail.utils";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { demandeurEmail, requestId, produits, statut, raisonRefus } = body;

    // Validate required parameters
    if (!demandeurEmail || !requestId || !statut || !Array.isArray(produits) || produits.length === 0) {
      return NextResponse.json(
        { error: "Paramètres manquants : demandeurEmail, requestId, statut et produits (tableau non vide) sont requis" },
        { status: 400 }
      );
    }

    // Fetch the Demandeur's details to get their name
    const user = await prisma.user.findUnique({
      where: { email: demandeurEmail },
      include: { demandeur: true },
    });

    if (!user || !user.demandeur) {
      return NextResponse.json(
        { error: "Utilisateur ou demandeur non trouvé pour cet email" },
        { status: 404 }
      );
    }

    const demandeurName = user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Demandeur";

    const sender = {
      name: "Équipe de Gestion de Stock",
      address: "gestionstockessths@gmail.com",
    };

    const recipients = [
      {
        name: demandeurName,
        address: demandeurEmail,
      },
    ];

    // Generate the product list as HTML
    const produitsListHtml = produits
      .map(
        (produit: { nom: string; quantite: number; remarque?: string }) =>
          `<li>${produit.nom} (Quantité: ${produit.quantite}${produit.remarque ? `, Remarque: ${produit.remarque}` : ""})</li>`
      )
      .join("");

    let subject: string;
    let message: string;

    if (statut === "APPROUVEE") {
      subject = `Votre demande a été approuvée (ID: ${requestId.substring(0, 8)}...)`;
      message = `
        <h1>Bonjour ${demandeurName},</h1>
        <p>Nous avons le plaisir de vous informer que votre demande a été <strong>approuvée</strong>.</p>
        <p>Voici la liste des produits demandés :</p>
        <ul>${produitsListHtml}</ul>
        <p>Vous pouvez maintenant procéder aux prochaines étapes. Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p>Cordialement,<br>L'équipe de Gestion de Stock</p>
        <p>PS : Ceci est un message automatique, merci de ne pas y répondre.</p>
        <p>Pour plus d'informations, visitez notre <a href="https://www.example.com">site web</a>.</p>
      `;
    } else if (statut === "REJETEE") {
      subject = `Votre demande a été refusée (ID: ${requestId.substring(0, 8)}...)`;
      message = `
        <h1>Bonjour ${demandeurName},</h1>
        <p>Nous sommes désolés de vous informer que votre demande a été <strong>refusée</strong>.</p>
        <p>Voici la liste des produits demandés :</p>
        <ul>${produitsListHtml}</ul>
        <p><strong>Motif du refus :</strong> ${raisonRefus || "Aucun motif spécifié"}</p>
        <p>Si vous avez des questions ou souhaitez plus d'informations, n'hésitez pas à nous contacter.</p>
        <p>Cordialement,<br>L'équipe de Gestion de Stock</p>
        <p>PS : Ceci est un message automatique, merci de ne pas y répondre.</p>
        <p>Pour plus d'informations, visitez notre <a href="https://www.example.com">site web</a>.</p>
      `;
    } else if (statut === "LIVREE") {
      subject = `Votre demande a été livrée (ID: ${requestId.substring(0, 8)}...)`;
      message = `
        <h1>Bonjour ${demandeurName},</h1>
        <p>Nous sommes ravis de vous informer que votre demande a été <strong>livrée</strong>.</p>
        <p>Voici la liste des produits livrés :</p>
        <ul>${produitsListHtml}</ul>
        <p>Merci de vérifier les articles reçus. Si vous avez des questions ou des préoccupations, n'hésitez pas à nous contacter.</p>
        <p>Cordialement,<br>L'équipe de Gestion de Stock</p>
        <p>PS : Ceci est un message automatique, merci de ne pas y répondre.</p>
        <p>Pour plus d'informations, visitez notre <a href="https://www.example.com">site web</a>.</p>
      `;
    } else {
      return NextResponse.json(
        { error: "Statut non reconnu. Utilisez 'APPROUVEE', 'REJETEE' ou 'LIVREE'" },
        { status: 400 }
      );
    }

    const emailResult = await sendEmail({
      sender,
      recipients,
      subject,
      message,
    });

    // Create a Notification entry
    await prisma.notification.create({
      data: {
        userId: user.id,
        message:
          statut === "APPROUVEE"
            ? `Votre demande (ID: ${requestId.substring(0, 8)}...) a été approuvée.`
            : statut === "REJETEE"
            ? `Votre demande (ID: ${requestId.substring(0, 8)}...) a été refusée. Motif : ${raisonRefus || "Aucun motif spécifié"}`
            : `Votre demande (ID: ${requestId.substring(0, 8)}...) a été livrée.`,
        typeEnvoi: "EMAIL",
        sentByEmail: true,
      },
    });

    return NextResponse.json({
      accepted: emailResult.accepted,
      message: "Notification envoyée au demandeur",
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email au demandeur :", error);
    return NextResponse.json(
      {
        message: "Impossible d'envoyer l'email au demandeur",
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}