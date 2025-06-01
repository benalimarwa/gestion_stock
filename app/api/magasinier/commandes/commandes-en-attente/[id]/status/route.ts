// app/api/magasinier/commandes/commandes-en-attente/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { StatutProduit } from "@prisma/client"; // Import the enum

// Fonction pour s'assurer que le répertoire existe
async function ensureDirectoryExists(dir: string) {
  try {
    await fs.promises.access(dir, fs.constants.F_OK);
  } catch (error) {
    // Le dossier n'existe pas, il faut le créer
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Utilisation de FormData au lieu de JSON pour supporter l'upload de fichiers
    const formData = await request.formData();
    const statut = formData.get("statut") as string;
    const raisonRetour = formData.get("raisonRetour") as string | null;
    
    // Valider le statut
    const validStatuts = ["LIVREE", "EN_RETOUR", "ANNULEE"];
    if (!validStatuts.includes(statut)) {
      return NextResponse.json(
        { error: "Statut de commande invalide" },
        { status: 400 }
      );
    }

    // Récupérer les informations de la commande avec les produits associés
    const commande = await prisma.commande.findUnique({
      where: { id },
      include: {
        produits: {
          include: {
            produit: true,
          },
        },
      },
    });

    if (!commande) {
      return NextResponse.json(
        { error: "Commande non trouvée" },
        { status: 404 }
      );
    }

    // Préparation des données à mettre à jour
    const updateData: any = { statut };

    // Traitement de la facture si disponible
    const factureFile = formData.get("facture") as File | null;
    let facturePath = undefined;
    
    if (factureFile && statut === "LIVREE" && factureFile.size > 0) {
      try {
        // Créer le chemin du dossier de destination
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "factures");
        
        // S'assurer que le dossier existe
        await ensureDirectoryExists(uploadsDir);
        
        // Générer un nom de fichier unique
        const fileName = `facture-${commande.id}-${uuidv4()}.pdf`;
        const filePath = path.join(uploadsDir, fileName);
        
        // Convertir le fichier en buffer
        const fileBuffer = Buffer.from(await factureFile.arrayBuffer());
        
        // Écrire le fichier
        await writeFile(filePath, fileBuffer);
        
        // Chemin relatif pour stocker dans la base de données
        facturePath = `/uploads/factures/${fileName}`;
        updateData.facture = facturePath;
      } catch (fileError) {
        console.error("Erreur lors du traitement du fichier:", fileError);
        // On continue sans le fichier si une erreur survient
      }
    }

    // Si c'est une livraison, ajouter la date de livraison et mettre à jour les quantités
    if (statut === "LIVREE") {
      // Définir la date de livraison à la date actuelle
      updateData.dateLivraison = new Date();

      // Mettre à jour la quantité de chaque produit dans la commande
      for (const item of commande.produits) {
        // Récupérer d'abord le produit pour avoir sa quantité actuelle et minimale
        const produit = await prisma.produit.findUnique({
          where: { id: item.produitId }
        });
            
        if (produit) {
          // Calculer la nouvelle quantité
          const nouvelleQuantite = produit.quantite + item.quantite;
                
          // Déterminer le nouveau statut avec les bonnes valeurs d'enum
          let nouveauStatut: StatutProduit;
          if (nouvelleQuantite === 0) {
            nouveauStatut = StatutProduit.RUPTURE;
          } else if (nouvelleQuantite <= produit.quantiteMinimale) {
            nouveauStatut = StatutProduit.CRITIQUE;
          } else {
            nouveauStatut = StatutProduit.NORMALE;
          }
                
          // Mettre à jour le produit
          await prisma.produit.update({
            where: { id: item.produitId },
            data: {
              quantite: nouvelleQuantite,
              statut: nouveauStatut
            }
          });
        }
      }
    }

    // Si c'est un retour, ajouter la raison du retour
    // CORRECTION: Le champ s'appelle "raisonRetour" pas "reasonReturn"
    if (statut === "EN_RETOUR" && raisonRetour) {
      // Vérifier si le champ existe dans le schéma
      // D'après votre schéma Prisma, il n'y a pas de champ "raisonRetour" dans le modèle Commande
      // Vous devrez soit l'ajouter au schéma, soit utiliser un autre moyen de stocker cette information
      
      // Pour l'instant, on commente cette ligne pour éviter l'erreur
      // updateData.raisonRetour = raisonRetour;
      
      // Alternative: stocker dans une table séparée ou dans un champ existant
      console.log("Raison du retour:", raisonRetour);
    }

    // Mettre à jour la commande
    const updatedOrder = await prisma.commande.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut de la commande:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du statut de la commande" },
      { status: 500 }
    );
  }
}