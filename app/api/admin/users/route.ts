import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Role, UserStatus } from "@prisma/client";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import type { User } from "@clerk/clerk-sdk-node";
import { auth } from "@clerk/nextjs/server";

// Define the response type for getUserList
interface UserListResponse {
  data: User[];
  totalCount: number;
}

// Define expected roles to match Prisma Role enum
const EXPECTED_ROLES: Role[] = [
  Role.ADMIN,
  Role.DEMANDEUR,
  Role.GESTIONNAIRE,
  Role.MAGASINNIER,
];

// Define the type for the POST request body
interface CreateUserRequestBody {
  email: string;
  name?: string;
  role: string;
  password: string;
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function POST(request: NextRequest) {
  try {
    const authResult = await auth();
    const { userId } = authResult;
    console.log("POST /api/admin/users - Authenticated userId:", userId);

    if (!userId) {
      console.log("POST /api/admin/users - No userId, returning 401");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    let adminUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!adminUser) {
      console.log("POST /api/admin/users - User not found in Prisma, fetching from Clerk");

      const clerkUser = await clerk.users.getUser(userId);
      let email = clerkUser.emailAddresses[0]?.emailAddress;

      if (!email) {
        const timestamp = Date.now();
        email = `user-${userId}-${timestamp}@example.com`;
        console.log("POST /api/admin/users - Generated fallback email:", email);
      }

      const existingUserWithEmail = await prisma.user.findUnique({
        where: { email: email },
      });

      if (existingUserWithEmail) {
        console.log("POST /api/admin/users - Email already exists in Prisma:", email);
        if (existingUserWithEmail.clerkUserId && existingUserWithEmail.clerkUserId !== userId) {
          console.log(
            "POST /api/admin/users - Updating existing user's clerkUserId to match new Clerk user"
          );
          adminUser = await prisma.user.update({
            where: { id: existingUserWithEmail.id },
            data: { clerkUserId: userId },
          });
        } else {
          adminUser = existingUserWithEmail;
        }
      } else {
        adminUser = await prisma.user.create({
          data: {
            clerkUserId: userId,
            email: email,
            role: Role.ADMIN,
            status: UserStatus.ACTIVE,
          },
        });
        console.log("POST /api/admin/users - Created user in Prisma:", adminUser);
      }
    }

    if (adminUser.role !== Role.ADMIN) {
      console.log("POST /api/admin/users - User not admin, returning 403");
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const { email: newUserEmail, name, role, password }: CreateUserRequestBody = await request.json();
    console.log("POST /api/admin/users - Request body:", { email: newUserEmail, name, role, password });

    let validRoles: string[];
    try {
      const roleEnumValues = await prisma.$queryRaw<
        { enum_range: string[] }[]
      >`SELECT enum_range(NULL::"Role") AS enum_range`;
      validRoles = roleEnumValues[0].enum_range[0]
        .replace("{", "")
        .replace("}", "")
        .split(",");
      console.log("POST /api/admin/users - Valid roles from database:", validRoles);

      const missingRoles = EXPECTED_ROLES.filter(
        (role) => !validRoles.includes(role)
      );
      if (missingRoles.length > 0) {
        console.warn(
          `POST /api/admin/users - Missing roles in database enum: ${missingRoles.join(", ")}`
        );
        validRoles = Array.from(new Set([...validRoles, ...EXPECTED_ROLES]));
      }
    } catch (error) {
      console.error(
        "POST /api/admin/users - Error fetching roles from database, using defaults:",
        error
      );
      validRoles = EXPECTED_ROLES;
    }

    const normalizedRole = role?.trim().toUpperCase();
    if (!normalizedRole || !validRoles.includes(normalizedRole)) {
      console.log("POST /api/admin/users - Invalid role:", normalizedRole);
      return NextResponse.json(
        {
          error: `Rôle invalide. Les rôles valides sont : ${validRoles.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const existingPrismaUser = await prisma.user.findUnique({
      where: { email: newUserEmail },
    });
    if (existingPrismaUser) {
      console.log("POST /api/admin/users - Email already exists in Prisma:", newUserEmail);
      return NextResponse.json(
        {
          error: "Un utilisateur avec cet email existe déjà dans la base de données",
        },
        { status: 409 }
      );
    }

    let clerkUser;
    try {
      clerkUser = await clerk.users.createUser({
        emailAddress: [newUserEmail],
        password,
        firstName: name || undefined,
        publicMetadata: { role: normalizedRole, status: "ACTIVE" },
      });
      console.log("POST /api/admin/users - User created in Clerk:", clerkUser.id);
    } catch (clerkError: any) {
      console.error("POST /api/admin/users - Error creating user in Clerk:", clerkError);
      if (clerkError.errors && clerkError.errors[0]?.code === "form_identifier_exists") {
        return NextResponse.json(
          { error: "Un utilisateur avec cet email existe déjà" },
          { status: 409 }
        );
      }
      throw clerkError;
    }

    const existingClerkUserId = await prisma.user.findUnique({
      where: { clerkUserId: clerkUser.id },
    });
    if (existingClerkUserId) {
      await clerk.users.deleteUser(clerkUser.id);
      console.log("POST /api/admin/users - Clerk user ID already exists, deleted Clerk user:", clerkUser.id);
      return NextResponse.json(
        {
          error: "Un utilisateur avec cet ID Clerk existe déjà dans la base de données",
        },
        { status: 409 }
      );
    }

    const userData = {
      clerkUserId: clerkUser.id,
      email: newUserEmail,
      name: name || null,
      role: normalizedRole as Role,
      status: UserStatus.ACTIVE,
    };
    console.log("POST /api/admin/users - Data sent to Prisma:", userData);

    let newUser;
    try {
      newUser = await prisma.user.create({
        data: userData,
      });
      console.log("POST /api/admin/users - User created in Prisma:", newUser.id);
    } catch (prismaError: any) {
      console.error("POST /api/admin/users - Error creating user in Prisma:", prismaError);
      await clerk.users.deleteUser(clerkUser.id);
      console.log("POST /api/admin/users - Deleted Clerk user after Prisma failure:", clerkUser.id);
      const errorMessage =
        prismaError.code === "P2002"
          ? `Conflit de données : ${prismaError.meta?.target?.join(", ")} déjà existant`
          : prismaError.message || "Erreur inconnue lors de la création dans la base de données";
      return NextResponse.json(
        {
          error: `Erreur lors de la création de l'utilisateur dans la base de données : ${errorMessage}`,
        },
        { status: 500 }
      );
    }

    if (normalizedRole === "DEMANDEUR") {
      try {
        await prisma.demandeur.create({
          data: {
            userId: newUser.id,
            type: "EMPLOYE",
          },
        });
        console.log("POST /api/admin/users - Demandeur record created for user:", newUser.id);
      } catch (demandeurError) {
        console.error("POST /api/admin/users - Error creating Demandeur record:", demandeurError);
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
    console.error("POST /api/admin/users - Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: Request) {
  try {
    // Check authentication using Clerk
    const { userId } = auth();
    console.log("GET /api/admin/users - Clerk userId:", userId);

    if (!userId) {
      console.error("GET /api/admin/users - No userId, unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch Clerk user to check role
    const clerkUser = await clerk.users.getUser(userId);
    console.log("GET /api/admin/users - Clerk user fetched:", {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      publicMetadata: clerkUser.publicMetadata,
    });

    // Temporary bypass for debugging
    console.log("GET /api/admin/users - DEBUG: Bypassing admin role check");
    // if (!clerkUser.publicMetadata?.role || clerkUser.publicMetadata.role !== "ADMIN") {
    //   console.error("GET / PARA admin/users - User not admin, role:", clerkUser.publicMetadata?.role);
    //   return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    // }

    // Fetch users from Prisma
    console.log("GET /api/admin/users - Fetching users from Prisma");
    const prismaUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        clerkUserId: true,
        role: true,
        status: true,
      },
    });

    // If no users in Prisma, sync with Clerk
    if (prismaUsers.length === 0) {
      console.log("GET /api/admin/users - No users in Prisma, syncing with Clerk");
      const clerkUsers: UserListResponse = await clerk.users.getUserList();
      const usersToCreate = clerkUsers.data
        .filter((u) => u.emailAddresses[0]?.emailAddress && u.publicMetadata?.role)
        .map((clerkUser) => {
          const role = typeof clerkUser.publicMetadata?.role === "string"
            ? clerkUser.publicMetadata.role.toUpperCase()
            : null;

          if (!role || !Object.values(Role).includes(role as Role)) {
            console.log(`GET /api/admin/users - Invalid role for user ${clerkUser.id}: ${role}, skipping`);
            return null;
          }

          const status = typeof clerkUser.publicMetadata?.status === "string" &&
            Object.values(UserStatus).includes(clerkUser.publicMetadata.status as UserStatus)
            ? clerkUser.publicMetadata.status as UserStatus
            : UserStatus.ACTIVE;

          return {
            clerkUserId: clerkUser.id,
            email: clerkUser.emailAddresses[0].emailAddress,
            role: role as Role,
            status,
          };
        })
        .filter((user): user is NonNullable<typeof user> => user !== null);

      if (usersToCreate.length > 0) {
        await prisma.user.createMany({ data: usersToCreate });
        console.log("GET /api/admin/users - Synced users from Clerk to Prisma:", usersToCreate.length);
      } else {
        console.log("GET /api/admin/users - No valid users to sync from Clerk");
      }

      // Fetch again after sync
      const syncedUsers = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          clerkUserId: true,
          role: true,
          status: true,
        },
      });
      console.log("GET /api/admin/users - Users fetched after sync:", syncedUsers.length);
      return NextResponse.json({ users: syncedUsers });
    }

    console.log("GET /api/admin/users - Users fetched successfully:", prismaUsers.length);
    return NextResponse.json({ users: prismaUsers });
  } catch (error) {
    console.error("GET /api/admin/users - Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}