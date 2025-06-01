import { NextResponse } from "next/server";
import { sendEmail } from "@/utils/mail.utils";
import { createClerkClient, User } from "@clerk/clerk-sdk-node";

interface Produit {
  nom: string;
  marque: string | null;
  quantite: number;
  quantiteMinimale: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { alertId, type, produit } = body;

    // Validate required parameters
    if (!alertId || typeof alertId !== "string" || !type || !produit) {
      console.error("Missing parameters:", { alertId, type, produit });
      return NextResponse.json(
        { error: "Paramètres manquants : alertId (chaîne), type et produit sont requis" },
        { status: 400 }
      );
    }

    if (typeof produit !== "object" || !produit.nom || typeof produit.quantite !== "number") {
      console.error("Invalid produit format:", produit);
      return NextResponse.json(
        { error: "Produit doit être un objet avec nom (chaîne) et quantite (nombre)" },
        { status: 400 }
      );
    }

    // Initialize Clerk client
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Fetch all users from Clerk and filter for admins
    console.log("Fetching users from Clerk...");
    const userListResponse = await clerkClient.users.getUserList();
    const users: User[] = userListResponse.data;
    console.log("Total users fetched:", users.length);
    const admins = users.filter((user: User) => user.publicMetadata.role === "ADMIN");
    console.log(
      "Admin users fetched:",
      admins.map((admin: User) => ({
        email: admin.emailAddresses[0]?.emailAddress,
        metadata: admin.publicMetadata,
      }))
    );

    if (!admins || admins.length === 0) {
      console.warn("No admin users found with role ADMIN");
      return NextResponse.json(
        { message: "Aucun admin trouvé pour recevoir l'alerte" },
        { status: 200 }
      );
    }

    const sender = {
      name: "Système de Gestion de Stock",
      address: "gestionstockessths@gmail.com",
    };

    // Prepare recipients (all admins)
    const recipients = admins
      .map((admin: User) => ({
        name: admin.firstName || admin.lastName || "Admin",
        address: admin.emailAddresses[0]?.emailAddress || "",
      }))
      .filter((recipient: { name: string; address: string }) => recipient.address);
    console.log("Recipients prepared:", recipients);

    if (recipients.length === 0) {
      console.warn("No valid recipient email addresses found");
      return NextResponse.json(
        { message: "Aucune adresse email valide trouvée pour les admins" },
        { status: 200 }
      );
    }

    let subject: string;
    let message: string;

    switch (type) {
      case "RUPTURE":
        subject = `Alerte : Rupture de stock pour ${produit.nom} (ID: ${alertId.substring(0, 8)}...)`;
        message = `
          <h1>Bonjour Équipe Admin,</h1>
          <p>Une rupture de stock a été détectée pour le produit <strong>${produit.nom}</strong> le ${new Date().toLocaleDateString("fr-FR")}.</p>
          <p>Détails : Quantité restante : ${produit.quantite} unité(s).</p>
          <p>Veuillez prendre des mesures immédiates pour réapprovisionner.</p>
          <p>Cordialement,<br>Système de Gestion de Stock</p>
          <p>PS : Ceci est un message automatique, merci de ne pas y répondre.</p>
          <p>Pour plus d'informations, visitez notre <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://www.example.com"}">site web</a>.</p>
        `;
        break;

      case "CRITIQUE":
        subject = `Alerte : Stock critique pour ${produit.nom} (ID: ${alertId.substring(0, 8)}...)`;
        message = `
          <h1>Bonjour Équipe Admin,</h1>
          <p>Un stock critique a été détecté pour le produit <strong>${produit.nom}</strong> le ${new Date().toLocaleDateString("fr-FR")}.</p>
          <p>Détails : Quantité restante : ${produit.quantite} unité(s) (seuil minimum : ${produit.quantiteMinimale}).</p>
          <p>Veuillez envisager un réapprovisionnement.</p>
          <p>Cordialement,<br>Système de Gestion de Stock</p>
          <p>PS : Ceci est un message automatique, merci de ne pas y répondre.</p>
          <p>Pour plus d'informations, visitez notre <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://www.example.com"}">site web</a>.</p>
        `;
        break;

      default:
        console.error("Invalid alert type:", type);
        return NextResponse.json(
          { error: "Type non reconnu. Valeurs possibles : 'RUPTURE', 'CRITIQUE'" },
          { status: 400 }
        );
    }

    console.log("Sending email to recipients:", recipients);
    const result = await sendEmail({
      sender,
      recipients,
      subject,
      message,
    });
    console.log("Email send result:", result);

    return NextResponse.json({
      accepted: result.accepted || [],
      message: "Alerte envoyée aux admins",
      rejected: result.rejected || [],
    });
  } catch (error) {
    console.error("Detailed error in /api/emails/admin/alert:", error);
    return NextResponse.json(
      {
        message: "Impossible d'envoyer les alertes aux admins",
        error: error instanceof Error ? error.message : "Erreur inconnue",
        stack: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}