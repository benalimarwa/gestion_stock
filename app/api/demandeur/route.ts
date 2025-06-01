import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/clerk-sdk-node";

const prisma = new PrismaClient();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type, password } = body;

    // Validation des champs requis
    if (!email) {
      return NextResponse.json(
        { error: "L'email est requis" },
        { status: 400 }
      );
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );
    }
    if (!["EMPLOYE", "ENSEIGNANT"].includes(type)) {
      return NextResponse.json(
        { error: "Type doit être EMPLOYE ou ENSEIGNANT" },
        { status: 400 }
      );
    }

    // Vérifier la configuration de Clerk
    if (!process.env.CLERK_SECRET_KEY) {
      throw new Error("CLERK_SECRET_KEY n'est pas défini dans les variables d'environnement");
    }

    // Créer l'utilisateur dans Clerk
    const clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      password,
      publicMetadata: { role: "DEMANDEUR" },
    }).catch((err) => {
      console.error("Erreur Clerk:", err);
      if (err.clerkError && err.errors) {
        throw new Error(`Erreur Clerk: ${err.errors[0].message}`);
      }
      throw new Error("Erreur lors de la création dans Clerk");
    });

    // Créer l'utilisateur et le demandeur dans Prisma
    const user = await prisma.user.create({
      data: {
        clerkUserId: clerkUser.id, // Store Clerk ID in clerkUserId
        email,
        role: "DEMANDEUR", // Matches your default role
        demandeur: {
          create: {
            type: type as "EMPLOYE" | "ENSEIGNANT", // Cast to match DemandeurType enum
          },
        },
      },
    });

    const demandeur = await prisma.demandeur.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });

    return NextResponse.json(demandeur, { status: 201 });
  } catch (error) {
    console.error("Erreur détaillée lors de la création du demandeur:", error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé dans la base de données" },
        { status: 409 }
      );
    }
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    // Vérifier si le demandeur existe dans Prisma
    const demandeur = await prisma.demandeur.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!demandeur) {
      return NextResponse.json(
        { error: "Demandeur non trouvé" },
        { status: 404 }
      );
    }

    // Supprimer l'utilisateur dans Clerk (using clerkUserId)
    if (demandeur.user.clerkUserId) {
      await clerk.users.deleteUser(demandeur.user.clerkUserId).catch((err) => {
        console.error("Erreur lors de la suppression dans Clerk:", err);
        throw new Error("Impossible de supprimer l'utilisateur dans Clerk");
      });
    }

    // Supprimer le demandeur et l'utilisateur dans Prisma
    await prisma.demandeur.delete({
      where: { id },
    });
    await prisma.user.delete({
      where: { id: demandeur.userId },
    });

    return NextResponse.json(
      { message: "Demandeur supprimé avec succès" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de la suppression du demandeur:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
export async function GET() {
  try {
    const demandeurs = await prisma.demandeur.findMany({
      include: { user: true, _count: { select: { demandes: true } } },
    });
    return NextResponse.json(demandeurs);
  } catch (error) {
    console.error("Erreur lors de la récupération des demandeurs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des demandeurs" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}