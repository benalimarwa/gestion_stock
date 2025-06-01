import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Webhook } from "svix";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error("Missing Svix headers");
      return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
    }

    const body = await request.text();
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Webhook secret not configured");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const wh = new Webhook(webhookSecret);
    const payload = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as { type: string; data: any };

    if (payload.type === "user.created" || payload.type === "user.updated") {
      const { id, email_addresses, first_name, last_name } = payload.data;
      let email = email_addresses[0]?.email_address;

      if (!email) {
        const timestamp = Date.now();
        email = `user-${id}-${timestamp}@example.com`;
      }

      const existingUser = await prisma.user.findUnique({
        where: { clerkUserId: id },
      });

      if (!existingUser) {
        const existingUserWithEmail = await prisma.user.findUnique({
          where: { email: email },
        });

        if (existingUserWithEmail) {
          await prisma.user.update({
            where: { id: existingUserWithEmail.id },
            data: {
              clerkUserId: id,
              name: `${first_name || ""} ${last_name || ""}`.trim() || null,
              firstName: first_name || null,
              lastName: last_name || null,
              // Preserve existing role
            },
          });
          console.log(`Updated user in Prisma via webhook: ${id}`);
        } else {
          const newUser = await prisma.user.create({
            data: {
              id: id, // Use Clerk ID as the User ID
              clerkUserId: id,
              email: email,
              name: `${first_name || ""} ${last_name || ""}`.trim() || null,
              firstName: first_name || null,
              lastName: last_name || null,
              role: "DEMANDEUR", // Default role for new users
            },
          });
          console.log(`User created in Prisma via webhook: ${id}`);

          // Create Demandeur record for the new user
          await prisma.demandeur.create({
            data: {
              userId: newUser.id,
              type: "EMPLOYE", // or "ENSEIGNANT" based on logic
            },
          });
          console.log(`Demandeur record created for user: ${id}`);
        }
      } else {
        // Update existing user, but preserve the role
        await prisma.user.update({
          where: { clerkUserId: id },
          data: {
            email: email,
            name: `${first_name || ""} ${last_name || ""}`.trim() || null,
            firstName: first_name || null,
            lastName: last_name || null,
            // Do not override role
          },
        });
        console.log(`User updated in Prisma via webhook: ${id}`);

        // Ensure Demandeur record exists
        await prisma.demandeur.upsert({
          where: { userId: existingUser.id },
          update: {},
          create: {
            userId: existingUser.id,
            type: "EMPLOYE", // or "ENSEIGNANT"
          },
        });
        console.log(`Demandeur record ensured for user: ${id}`);
      }
    } else if (payload.type === "user.deleted") {
      const { id } = payload.data;
      const user = await prisma.user.findUnique({
        where: { clerkUserId: id },
      });

      if (user) {
        await prisma.user.delete({
          where: { id: user.id },
        });
        console.log(`User deleted from Prisma via webhook: ${id}`);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}