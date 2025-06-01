import nodemailer from "nodemailer";

interface EmailOptions {
  sender: { name: string; address: string };
  recipients: { name: string; address: string }[];
  subject: string;
  message: string;
}

export async function sendEmail({ sender, recipients, subject, message }: EmailOptions) {
  try {
    // Validate environment variables
    if (!process.env.MAIL_USER) {
      console.error("MAIL_USER environment variable is not set");
      throw new Error("MAIL_USER environment variable is missing");
    }
    if (!process.env.MAIL_PASSWORD) {
      console.error("MAIL_PASSWORD environment variable is not set");
      throw new Error("MAIL_PASSWORD environment variable is missing");
    }
    if (!process.env.MAIL_HOST) {
      console.error("MAIL_HOST environment variable is not set");
      throw new Error("MAIL_HOST environment variable is missing");
    }
    if (!process.env.MAIL_PORT) {
      console.error("MAIL_PORT environment variable is not set");
      throw new Error("MAIL_PORT environment variable is missing");
    }

    // Log SMTP configuration (without sensitive data)
    console.log("SMTP Configuration:", {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      user: process.env.MAIL_USER,
    });

    // Validate recipients
    if (!recipients.length) {
      console.error("No recipients provided");
      throw new Error("At least one recipient is required");
    }

    // Create a transporter using Brevo SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT, 10),
      secure: false, // Use TLS (false for port 587)
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    // Verify transporter connection
    console.log("Verifying SMTP connection...");
    await transporter.verify();
    console.log("SMTP transporter verified successfully for user:", process.env.MAIL_USER);

    // Prepare email options
    const mailOptions = {
      from: {
        name: sender.name,
        address: sender.address,
      },
      to: recipients.map((recipient) => ({
        name: recipient.name,
        address: recipient.address,
      })),
      subject,
      html: message,
    };

    // Send the email
    console.log("Sending email with options:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject,
    });
    const result = await transporter.sendMail(mailOptions);
    console.log("Email send result:", {
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response,
      messageId: result.messageId,
    });

    return {
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error("Error in sendEmail:", error);
    throw new Error(`Échec de l'envoi de l'email: ${error instanceof Error ? error.message : "Erreur inconnue"}`);
  }
}