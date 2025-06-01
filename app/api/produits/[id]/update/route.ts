// app/api/produits/[id]/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(request: NextRequest, { params }: { params:Promise< { id: string } >}) {
  const { id } = await params;
  
  try {
    const { quantite } = await request.json();

    // Récupération du produit
    const produit = await prisma.produit.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        quantite: true,
        quantiteMinimale: true, // Correction ici
        statut: true,
      },
    });

    if (!produit) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    // Mise à jour du statut selon la nouvelle quantité
    let nouveauStatut = produit.statut;
    if (quantite === 0) {
      nouveauStatut = "RUPTURE";
    } else if (quantite < produit.quantiteMinimale) {
      nouveauStatut = "CRITIQUE";
    } else {
      nouveauStatut = "NORMALE";
    }

    // Exécution de la mise à jour en transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mise à jour du produit
      const updatedProduit = await tx.produit.update({
        where: { id },
        data: { quantite, statut: nouveauStatut, updatedAt: new Date() },
      });

      // Gestion des alertes et notifications en cas de rupture de stock
      if (quantite === 0) {
        await tx.alerte.create({
          data: {
            produitId: id,
            typeAlerte: "RUPTURE",
            description: `Le produit ${produit.nom} est en rupture de stock.`,
            date: new Date(),
          },
        });

        const adminUser = await tx.user.findFirst({ where: { role: "ADMIN" } });
        if (adminUser) {
          await tx.notification.create({
            data: {
              userId: adminUser.id,
              message: `Rupture de stock pour le produit ${produit.nom} (ID: ${id.slice(0, 8)})`,
              dateEnvoi: new Date(),
              typeEnvoi: "EMAIL",
            },
          });
        }
      }

      return updatedProduit;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du produit:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
