import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    console.log("Authenticated user:", { userId: user?.id }); // Debug authentication
    if (!user) {
      console.log("Utilisateur non authentifié");
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    // Vérifier le rôle magasinier ou admin
    const dbUser = await prisma.user.findFirst({
      where: { clerkUserId: user.id },
    });
    console.log("Database user:", { clerkUserId: user.id, dbUser }); // Debug user lookup

    if (!dbUser || !["MAGASINNIER", "ADMIN"].includes(dbUser.role)) {
      console.log("Accès interdit: utilisateur non autorisé", { userId: user.id, role: dbUser?.role });
      return NextResponse.json(
        { message: "Accès interdit - Rôle MAGASINNIER ou ADMIN requis" },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await req.json();
      console.log("Received request to /api/registre:", { body }); // Debug request body
    } catch (error) {
      console.error("Invalid JSON in request body:", error);
      return NextResponse.json(
        { message: "Corps de la requête invalide" },
        { status: 400 }
      );
    }

    const { productIds, actionType, description } = body;

    // Validate actionType
    if (
      !actionType ||
      ![
        "PRODUIT_AJOUTE",
        "PRODUIT_MODIFIE",
        "PRODUIT_SUPPRIME",
        "COMMANDE_LIVREE",
        "DEMANDE_PRISE",
        "DEMANDEEXCEPT_PRISE",
        "VALIDE_COMMANDE",
        "ACCEPT_DEMANDE",
      ].includes(actionType)
    ) {
      console.log("Invalid actionType:", actionType);
      return NextResponse.json(
        { message: "Type d'action invalide" },
        { status: 400 }
      );
    }

    // Validate productIds
    if (productIds && !Array.isArray(productIds) && typeof productIds !== "string") {
      console.log("Invalid productIds format:", productIds);
      return NextResponse.json(
        { message: "productIds doit être une chaîne ou un tableau" },
        { status: 400 }
      );
    }

    // Validate productIds array contents
    if (Array.isArray(productIds)) {
      if (productIds.some(id => typeof id !== "string" || id.trim() === "")) {
        console.log("Invalid productIds entries:", productIds);
        return NextResponse.json(
          { message: "Tous les productIds doivent être des chaînes non vides" },
          { status: 400 }
        );
      }
    }

    // Validate description
    if (description && typeof description !== "string") {
      console.log("Invalid description format:", description);
      return NextResponse.json(
        { message: "description doit être une chaîne" },
        { status: 400 }
      );
    }

    // Créer une entrée dans le registre
    console.log("Creating registre entry for user:", dbUser.id); // Debug registre creation
    const registreEntry = await prisma.registre.create({
      data: {
        userId: dbUser.id,
        actionType,
        description: description || null,
        createdAt: new Date(),
      },
    });

    // Créer des entrées dans RegistreProduit si productIds est fourni
    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      console.log("Creating RegistreProduit entries:", productIds); // Debug RegistreProduit
      await prisma.registreProduit.createMany({
        data: productIds.map((productId: string) => ({
          registreId: registreEntry.id,
          produitId: productId,
          action: actionType,
          createdAt: new Date(),
        })),
      });
    } else if (typeof productIds === "string" && productIds.trim() !== "") {
      // Backward compatibility for single productId
      console.log("Creating single RegistreProduit entry:", productIds); // Debug single entry
      await prisma.registreProduit.create({
        data: {
          registreId: registreEntry.id,
          produitId: productIds,
          action: actionType,
          createdAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Action enregistrée dans le registre",
      registreEntry,
    }, { status: 200 });
  } catch (error: any) {
    console.error("Erreur lors de l'enregistrement dans le registre:", {
      message: error.message,
      stack: error.stack,
      requestBody: await req.json().catch(() => ({})),
    });
    return NextResponse.json(
      { message: "Une erreur est survenue", details: error.message },
      { status: 500 }
    );
  }
}