import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: demandeId } = await params;
    const user = await currentUser();
    console.log("Utilisateur Clerk (POST /prise):", {
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
        { message: "Accès interdit - Rôle MAGASINIER requis" },
        { status: 403 }
      );
    }

    // Vérifier que la demande existe et est LIVREE
    const demande = await prisma.demandeExceptionnelle.findUnique({
      where: {
        id: demandeId,
        statut: "LIVREE",
      },
      include: {
        demandeur: true,
        produitsExceptionnels: {
          include: {
            produitExceptionnel: true,
          },
        },
      },
    });

    if (!demande) {
      console.log("Demande non trouvée ou non livrée:", demandeId);
      return NextResponse.json(
        { message: "Demande non trouvée ou non livrée" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Marquer la demande comme PRISE
      await tx.demandeExceptionnelle.update({
        where: { id: demandeId },
        data: { statut: "PRISE" },
      });

      // 2. Traiter chaque produit exceptionnel
      for (const item of demande.produitsExceptionnels) {
        // Vérifier si le produit existe déjà dans le stock normal
        let produit = await tx.produit.findFirst({
          where: {
            nom: {
              equals: item.produitExceptionnel.name,
              mode: 'insensitive'
            },
            marque: {
              equals: item.produitExceptionnel.marque || "Inconnu",
              mode: 'insensitive'
            },
          },
        });

        if (produit) {
          // Le produit existe déjà dans le stock normal
          if (produit.quantite < item.quantite) {
            console.log("Stock insuffisant pour le produit:", {
              nom: produit.nom,
              marque: produit.marque,
              quantiteDemandee: item.quantite,
              quantiteDisponible: produit.quantite,
            });
            throw new Error(
              `Stock insuffisant pour ${produit.nom} (marque: ${produit.marque || "Inconnu"}). Demandé: ${item.quantite}, Disponible: ${produit.quantite}`
            );
          }

          // Décrémenter la quantité
          await tx.produit.update({
            where: { id: produit.id },
            data: { quantite: { decrement: item.quantite } },
          });

          console.log(`Stock mis à jour pour ${produit.nom}: ${produit.quantite} -> ${produit.quantite - item.quantite}`);
        } else {
          // Le produit n'existe pas dans le stock normal
          // Nous devons d'abord l'ajouter au stock avec la quantité demandée
          // puis immédiatement la décrémenter (ce qui donnera 0)
          
          // Trouver une catégorie par défaut ou créer une catégorie "Exceptionnels"
          let categorieExceptionnelle = await tx.categorie.findFirst({
            where: { nom: "Exceptionnels" }
          });

          if (!categorieExceptionnelle) {
            categorieExceptionnelle = await tx.categorie.create({
              data: {
                nom: "Exceptionnels",
                description: "Produits issus de demandes exceptionnelles"
              }
            });
          }

          // Créer le produit dans le stock avec la quantité demandée
          const nouveauProduit = await tx.produit.create({
            data: {
              nom: item.produitExceptionnel.name,
              marque: item.produitExceptionnel.marque || "Inconnu",
              quantite: item.quantite, // On l'ajoute avec la quantité demandée
              categorieId: categorieExceptionnelle.id,
              statut: "NORMALE", // Comme demandé dans votre remarque
              critere: "CONSOMMABLE", // Par défaut pour les produits exceptionnels
              quantiteMinimale: 0,
              remarque: `Produit ajouté suite à une demande exceptionnelle - ${item.produitExceptionnel.description || ""}`,
            },
          });

          // Puis immédiatement décrémenter la quantité (ce qui donnera 0)
          await tx.produit.update({
            where: { id: nouveauProduit.id },
            data: { quantite: { decrement: item.quantite } },
          });

          console.log(`Nouveau produit créé et consommé: ${nouveauProduit.nom} (quantité finale: 0)`);
        }
      }

      // 3. Créer la notification
      const demandeurData = await tx.demandeur.findUnique({
        where: { id: demande.demandeurId },
        select: { userId: true },
      });

      if (demandeurData?.userId) {
        await tx.notification.create({
          data: {
            userId: demandeurData.userId,
            message: `Votre demande exceptionnelle (ID: ${demandeId.substring(0, 8)}...) a été prise et traitée. Les articles ont été retirés du stock.`,
            typeEnvoi: "SYSTEM",
          },
        });
      }

      // 4. Créer une entrée dans le registre pour traçabilité
      await tx.registre.create({
        data: {
          userId: dbUser.id,
          actionType: "DEMANDEEXCEPT_PRISE",
          description: `Demande exceptionnelle ${demandeId.substring(0, 8)}... marquée comme prise et stock mis à jour`,
        },
      });
    });

    console.log("Demande marquée comme PRISE et stock mis à jour pour la demande:", demandeId);

    return NextResponse.json({
      success: true,
      message: "Demande exceptionnelle marquée comme prise et stock mis à jour avec succès",
    });
  } catch (error: any) {
    console.error("Erreur lors du traitement de la demande exceptionnelle:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      {
        message: "Une erreur est survenue lors du traitement de la demande exceptionnelle",
        details: error.message,
      },
      { status: 500 }
    );
  }
}