import { NextResponse } from "next/server";
import { sendEmail } from "@/utils/mail.utils";
import prisma from "@/lib/db";

interface Produit {
  nom: string;
  marque: string;
  quantite: number;
  quantiteMinimale?: number;
}

interface Recipient {
  email: string;
  name?: string;
}

interface EmailRequest {
  recipients: Recipient[];
  lowStockProducts: Produit[];
  ruptureProducts: Produit[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, lowStockProducts, ruptureProducts } = body as EmailRequest;

    console.log('Received request body:', { recipients, lowStockProducts, ruptureProducts });

    // Validate required parameters
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "Paramètres manquants : recipients (tableau non vide) est requis" },
        { status: 400 }
      );
    }
    if (!lowStockProducts || !ruptureProducts) {
      return NextResponse.json(
        { error: "Paramètres manquants : lowStockProducts et ruptureProducts sont requis" },
        { status: 400 }
      );
    }

    // Fetch user details for each recipient to get their name and ID for notifications
    const users = await Promise.all(
      recipients.map(async (recipient) => {
        const user = await prisma.user.findUnique({
          where: { email: recipient.email },
          select: { id: true, name: true, role: true },
        });
        return { ...recipient, user };
      })
    );

    const invalidUsers = users.filter(r => !r.user);
    if (invalidUsers.length > 0) {
      return NextResponse.json(
        { error: `Utilisateurs non trouvés pour les emails suivants : ${invalidUsers.map(r => r.email).join(", ")}` },
        { status: 404 }
      );
    }

    const sender = {
      name: "Équipe de Gestion de Stock",
      address: process.env.EMAIL_USER || "gestionstockessths@gmail.com",
    };

    // Prepare recipients with their names
    const formattedRecipients = users.map(r => ({
      name: r.user!.name || r.name || "Magasinier",
      address: r.email,
    }));

    console.log('Sender:', sender, 'Recipients:', formattedRecipients);

    // Generate the product lists as HTML
    const lowStockListHtml = lowStockProducts.length > 0
      ? lowStockProducts
          .map(p => `<li>${p.nom} (${p.marque}) : ${p.quantite}/${p.quantiteMinimale} restant</li>`)
          .join("")
      : "";
    const ruptureListHtml = ruptureProducts.length > 0
      ? ruptureProducts
          .map(p => `<li>${p.nom} (${p.marque})</li>`)
          .join("")
      : "";

    const subject = "Alerte Stock Critique ou Rupture - Magasin";
    const message = `
      <h1>Bonjour,</h1>
      <p>Une mise à jour des stocks a été détectée nécessitant une action au niveau du magasin :</p>
      ${lowStockProducts.length > 0 ? `<h2>Stocks Critiques :</h2><ul>${lowStockListHtml}</ul>` : ""}
      ${ruptureProducts.length > 0 ? `<h2>Ruptures de Stock :</h2><ul>${ruptureListHtml}</ul>` : ""}
      <p>Merci de prendre les mesures nécessaires.</p>
      <p>Cordialement,<br>L'équipe de Gestion de Stock</p>
      <p>PS : Ceci est un message automatique, merci de ne pas y répondre.</p>
      <p>Pour plus d'informations, visitez notre <a href="https://www.example.com">site web</a>.</p>
    `;

    console.log('Sending email with subject:', subject, 'to:', formattedRecipients.map(r => r.address).join(','));
    const emailResult = await sendEmail({
      sender,
      recipients: formattedRecipients,
      subject,
      message,
    });
    console.log('Email send result:', emailResult);

    // Create a Notification entry for each recipient
    await Promise.all(
      users.map(user =>
        prisma.notification.create({
          data: {
            userId: user.user!.id,
            message: `Alerte stock : ${lowStockProducts.length} produit(s) en stock critique, ${ruptureProducts.length} produit(s) en rupture.`,
            typeEnvoi: "EMAIL",
            sentByEmail: true,
          },
        })
      )
    );

    return NextResponse.json({
      accepted: emailResult.accepted,
      message: "Notifications envoyées aux magasiniers",
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email aux magasiniers :", error);
    return NextResponse.json(
      {
        message: "Impossible d'envoyer l'email aux magasiniers",
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}