import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

// Define the type for the produits exceptionnels structure
type ProduitExceptionnelItem = {
  quantite: number;
  produitExceptionnel: {
    name: string;
    marque: string | null;
  };
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: demandeId } = await params;
    const user = await currentUser();
    console.log("Utilisateur Clerk (POST /livree):", {
      id: user?.id,
      email: user?.emailAddresses[0]?.emailAddress,
      role: user?.publicMetadata?.role,
    });

    if (!user) {
      console.log("Utilisateur non authentifié");
      return NextResponse.json(
        { message: "Non autorisé" },
        { status: 401 }
      );
    }

    // Vérifier le rôle magasinier
    const dbUser = await prisma.user.findFirst({
      where: { clerkUserId: user.id },
    });

    if (!dbUser || dbUser.role !== "MAGASINNIER") {
      console.log("Accès interdit: utilisateur non magasinier", { userId: user.id, role: dbUser?.role });
      return NextResponse.json(
        { message: "Accès interdit - Rôle MAGASINNIER requis" },
        { status: 403 }
      );
    }

    // Vérifier que la demande existe et est COMMANDEE
    const demande = await prisma.demandeExceptionnelle.findUnique({
      where: {
        id: demandeId,
        statut: "COMMANDEE",
      },
      include: {
        produitsExceptionnels: {
          include: {
            produitExceptionnel: true,
          },
        },
      },
    });

    if (!demande) {
      console.log("Demande non trouvée ou non commandée:", demandeId);
      return NextResponse.json(
        { message: "Demande non trouvée ou non commandée" },
        { status: 404 }
      );
    }

    // Trouver ou créer une catégorie par défaut
    let defaultCategory = await prisma.categorie.findFirst({
      where: { nom: "Uncategorized" },
    });

    if (!defaultCategory) {
      console.log("Catégorie 'Uncategorized' non trouvée, création en cours...");
      defaultCategory = await prisma.categorie.create({
        data: { nom: "Uncategorized" },
      });
    }

    // Ajouter les produits à la table Produit
    const produitsToCreate = demande.produitsExceptionnels.map((item: ProduitExceptionnelItem) => ({
      nom: item.produitExceptionnel.name,
      quantite: item.quantite,
      marque: item.produitExceptionnel.marque ?? undefined, // Convertir null en undefined
      categorieId: defaultCategory.id,
    }));

    await prisma.produit.createMany({
      data: produitsToCreate,
      skipDuplicates: true, // Éviter les doublons si le produit existe déjà
    });

    console.log("Produits ajoutés à la table Produit:", produitsToCreate);

    // Mettre à jour le statut à LIVREE
    await prisma.demandeExceptionnelle.update({
      where: { id: demandeId },
      data: { statut: "LIVREE", updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Demande marquée comme livrée et produits ajoutés avec succès",
    });
  } catch (error: any) {
    console.error("Erreur lors du marquage comme livrée:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      { message: "Une erreur est survenue lors du marquage comme livrée", details: error.message },
      { status: 500 }
    );
  }
}