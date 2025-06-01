import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/clerk-sdk-node";

const prisma = new PrismaClient();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Define the expected roles as a fallback
const EXPECTED_ROLES = ["ADMIN", "DEMANDEUR", "GESTIONNAIRE", "MAGASINNIER"];

export async function POST(request: NextRequest) {
  try {
    // Log the incoming request details
    console.log("POST /api/admin/users - Incoming request:");
    console.log("Request URL:", request.url);
    console.log("Request headers:", Object.fromEntries(request.headers));
    console.log("Cookies:", request.cookies.getAll());

    // Authenticate the user
    let authResult;
    try {
      authResult = await auth();
      console.log("Clerk auth result:", authResult);
    } catch (authError) {
      console.error("Clerk auth() failed:", authError);
      return NextResponse.json(
        { error: "Erreur d'authentification Clerk: " + (authError instanceof Error ? authError.message : "Erreur inconnue") },
        { status: 403 }
      );
    }

    const { userId } = authResult;
    console.log("Authenticated userId from Clerk:", userId);

    if (!userId) {
      console.log("No userId found in auth result. Returning 401.");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Check if the user exists in Prisma, and create them if they don't
    let adminUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });
    console.log("User found in Prisma:", adminUser);

    if (!adminUser) {
      console.log(`Utilisateur non trouvé dans Prisma pour clerkUserId: ${userId}. Tentative de synchronisation depuis Clerk...`);
      try {
        const clerkUser = await clerk.users.getUser(userId);
        console.log("Clerk user data:", clerkUser);

        const email = clerkUser.emailAddresses?.[0]?.emailAddress;
        if (!email) {
          console.error(`Aucune adresse email trouvée pour l'utilisateur Clerk: ${userId}`);
          return NextResponse.json({ error: "Utilisateur Clerk invalide - Aucune adresse email" }, { status: 400 });
        }

        adminUser = await prisma.user.create({
          data: {
            email,
            name: clerkUser.firstName || null,
            role: "DEMANDEUR", // Default role for new users
            clerkUserId: userId,
          },
        });
        console.log(`Utilisateur créé dans Prisma: ${adminUser.email} (clerkUserId: ${userId})`);
      } catch (clerkError) {
        console.error("Erreur lors de la récupération de l'utilisateur depuis Clerk:", clerkError);
        return NextResponse.json(
          { error: "Erreur lors de la synchronisation avec Clerk: " + (clerkError instanceof Error ? clerkError.message : "Erreur inconnue") },
          { status: 500 }
        );
      }
    }

    // Parse the request body
    const { email, name, role, password } = await request.json();
    console.log("Parsed request body:", { email, name, role, password });

    // Fetch valid Role enum values from the database
    let validRoles: string[];
    try {
      const roleEnumValues = await prisma.$queryRaw<
        { enum_range: string[] }[]
      >`SELECT enum_range(NULL::"Role") AS enum_range`;
      validRoles = roleEnumValues[0].enum_range[0]
        .replace("{", "")
        .replace("}", "")
        .split(",");
      console.log("Rôles valides dans la base de données:", validRoles);

      const missingRoles = EXPECTED_ROLES.filter(
        (role) => !validRoles.includes(role)
      );
      if (missingRoles.length > 0) {
        console.warn(
          `⚠️ Les rôles suivants sont manquants dans l'enum Role de la base de données : ${missingRoles.join(", ")}`
        );
        validRoles = Array.from(new Set([...validRoles, ...EXPECTED_ROLES]));
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des rôles depuis la base de données:", error);
      validRoles = EXPECTED_ROLES;
    }

    // Normalize and validate the role
    const normalizedRole = role?.trim().toUpperCase();
    if (!normalizedRole || !validRoles.includes(normalizedRole)) {
      return NextResponse.json(
        {
          error: `Rôle invalide. Les rôles valides sont : ${validRoles.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Check if the email already exists in Prisma
    const existingPrismaUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingPrismaUser) {
      return NextResponse.json(
        {
          error: "Un utilisateur avec cet email existe déjà dans la base de données",
        },
        { status: 409 }
      );
    }

    // Create the user in Clerk
    let clerkUser;
    try {
      clerkUser = await clerk.users.createUser({
        emailAddress: [email],
        password,
        firstName: name || undefined,
      });
      console.log("Utilisateur créé dans Clerk:", clerkUser.id);
    } catch (clerkError: any) {
      console.error("Erreur lors de la création de l'utilisateur dans Clerk:", clerkError);
      if (clerkError.errors && clerkError.errors[0]?.code === "form_identifier_exists") {
        return NextResponse.json(
          { error: "Un utilisateur avec cet email existe déjà" },
          { status: 409 }
        );
      }
      throw clerkError;
    }

    // Check if the clerkUserId already exists in Prisma
    const existingClerkUserId = await prisma.user.findUnique({
      where: { clerkUserId: clerkUser.id },
    });
    if (existingClerkUserId) {
      await clerk.users.deleteUser(clerkUser.id);
      return NextResponse.json(
        {
          error: "Un utilisateur avec cet ID Clerk existe déjà dans la base de données",
        },
        { status: 409 }
      );
    }

    // Create the user in Prisma
    const userData = {
      email,
      name: name || null,
      role: normalizedRole,
      clerkUserId: clerkUser.id,
    };
    console.log("Données envoyées à Prisma pour création:", userData);

    let newUser;
    try {
      newUser = await prisma.user.create({
        data: userData,
      });
      console.log("Utilisateur créé dans Prisma:", newUser.id);
    } catch (prismaError: any) {
      console.error("Erreur lors de la création de l'utilisateur dans Prisma:", prismaError);
      await clerk.users.deleteUser(clerkUser.id);
      const errorMessage =
        prismaError.code === "P2002"
          ? `Conflit de données : ${prismaError.meta?.target?.join(", ")} déjà existant`
          : prismaError.message || "Erreur inconnue lors de la création dans la base de données";
      return NextResponse.json(
        { error: `Erreur lors de la création de l'utilisateur dans la base de données : ${errorMessage}` },
        { status: 500 }
      );
    }

    // If the role is DEMANDEUR, create a related Demandeur record
    if (normalizedRole === "DEMANDEUR") {
      try {
        await prisma.demandeur.create({
          data: {
            userId: newUser.id,
            type: "EMPLOYE",
          },
        });
        console.log("Enregistrement Demandeur créé pour l'utilisateur:", newUser.id);
      } catch (demandeurError) {
        console.error("Erreur lors de la création de l'enregistrement Demandeur:", demandeurError);
        await prisma.user.delete({ where: { id: newUser.id } });
        await clerk.users.deleteUser(clerkUser.id);
        return NextResponse.json(
          { error: "Erreur lors de la création de l'enregistrement Demandeur" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Erreur générale dans POST /api/admin/users:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Log the incoming request details
    console.log("PATCH /api/admin/users - Incoming request:");
    console.log("Request URL:", request.url);
    console.log("Request headers:", Object.fromEntries(request.headers));
    console.log("Cookies:", request.cookies.getAll());

    // Authenticate the user
    let authResult;
    try {
      authResult = await auth();
      console.log("Clerk auth result:", authResult);
    } catch (authError) {
      console.error("Clerk auth() failed:", authError);
      return NextResponse.json(
        { error: "Erreur d'authentification Clerk: " + (authError instanceof Error ? authError.message : "Erreur inconnue") },
        { status: 403 }
      );
    }

    const { userId } = authResult;
    console.log("Authenticated userId from Clerk:", userId);

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Check if the user exists in Prisma
    let adminUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });
    console.log("User found in Prisma:", adminUser);

    if (!adminUser) {
      console.log(`Utilisateur non trouvé dans Prisma pour clerkUserId: ${userId}. Tentative de synchronisation depuis Clerk...`);
      try {
        const clerkUser = await clerk.users.getUser(userId);
        console.log("Clerk user data:", clerkUser);

        const email = clerkUser.emailAddresses?.[0]?.emailAddress;
        if (!email) {
          console.error(`Aucune adresse email trouvée pour l'utilisateur Clerk: ${userId}`);
          return NextResponse.json({ error: "Utilisateur Clerk invalide - Aucune adresse email" }, { status: 400 });
        }

        adminUser = await prisma.user.create({
          data: {
            email,
            name: clerkUser.firstName || null,
            role: "DEMANDEUR",
            clerkUserId: userId,
          },
        });
        console.log(`Utilisateur créé dans Prisma: ${adminUser.email} (clerkUserId: ${userId})`);
      } catch (clerkError) {
        console.error("Erreur lors de la récupération de l'utilisateur depuis Clerk:", clerkError);
        return NextResponse.json(
          { error: "Erreur lors de la synchronisation avec Clerk: " + (clerkError instanceof Error ? clerkError.message : "Erreur inconnue") },
          { status: 500 }
        );
      }
    }

    // Parse the request body
    const { userId: targetUserId, role } = await request.json();
    if (!targetUserId || !role) {
      return NextResponse.json({ error: "userId et rôle sont requis" }, { status: 400 });
    }

    // Fetch valid Role enum values from the database
    let validRoles: string[];
    try {
      const roleEnumValues = await prisma.$queryRaw<
        { enum_range: string[] }[]
      >`SELECT enum_range(NULL::"Role") AS enum_range`;
      validRoles = roleEnumValues[0].enum_range[0]
        .replace("{", "")
        .replace("}", "")
        .split(",");
      console.log("Rôles valides dans la base de données:", validRoles);
    } catch (error) {
      console.error("Erreur lors de la récupération des rôles depuis la base de données:", error);
      validRoles = EXPECTED_ROLES;
    }

    // Normalize and validate the role
    const normalizedRole = role.trim().toUpperCase();
    if (!validRoles.includes(normalizedRole)) {
      return NextResponse.json(
        {
          error: `Rôle invalide. Les rôles valides sont : ${validRoles.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Prevent the last admin from being demoted
    if (targetUser.role.toUpperCase() === "ADMIN" && normalizedRole !== "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Impossible de supprimer le dernier administrateur" },
          { status: 400 }
        );
      }
    }

    // Update the user's role
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: normalizedRole },
    });
    console.log(`Rôle mis à jour pour l'utilisateur ${updatedUser.email}: ${updatedUser.role}`);

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("Erreur générale dans PATCH /api/admin/users:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    // Log the incoming request details
    console.log("GET /api/admin/users - Incoming request:");
    console.log("Request URL:", request.url);
    console.log("Request headers:", Object.fromEntries(request.headers));
    console.log("Cookies:", request.cookies.getAll());

    if (type === "roles") {
      let validRoles: string[];
      try {
        const roleEnumValues = await prisma.$queryRaw<
          { enum_range: string[] }[]
        >`SELECT enum_range(NULL::"Role") AS enum_range`;
        validRoles = roleEnumValues[0].enum_range[0]
          .replace("{", "")
          .replace("}", "")
          .split(",");
        console.log("Rôles valides dans la base de données:", validRoles);

        const missingRoles = EXPECTED_ROLES.filter(
          (role) => !validRoles.includes(role)
        );
        if (missingRoles.length > 0) {
          console.warn(
            `⚠️ Les rôles suivants sont manquants dans l'enum Role de la base de données : ${missingRoles.join(", ")}`
          );
          validRoles = Array.from(new Set([...validRoles, ...EXPECTED_ROLES]));
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des rôles depuis la base de données:", error);
        validRoles = EXPECTED_ROLES;
      }
      return NextResponse.json(validRoles);
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        demandeur: {
          select: {
            type: true,
          },
        },
      },
    });
    console.log("Utilisateurs récupérés depuis Prisma:", users);
    return NextResponse.json(users);
  } catch (error) {
    console.error("Erreur générale dans GET /api/admin/users:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}