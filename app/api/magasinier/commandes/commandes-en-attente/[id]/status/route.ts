import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { writeFile, mkdir, unlink, access } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { StatutProduit, StatutCommande } from "@prisma/client";
import { constants } from "fs";

async function ensureDirectoryExists(dir: string): Promise<void> {
  try {
    // Vérifier si le dossier existe déjà
    await access(dir, constants.F_OK);
    console.log(`Directory already exists: ${dir}`);
  } catch {
    // Le dossier n'existe pas, le créer
    try {
      await mkdir(dir, { recursive: true });
      console.log(`Directory created: ${dir}`);
    } catch (error) {
      console.error(`Failed to create directory ${dir}:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(`Unable to create directory ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

function isValidPdfFile(file: File): { isValid: boolean; error?: string } {
  // Vérifier la taille
  if (file.size === 0) {
    return { isValid: false, error: "Le fichier facture est vide" };
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { isValid: false, error: "Le fichier est trop volumineux (max 10MB)" };
  }

  // Vérifier l'extension
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.pdf')) {
    return { isValid: false, error: "Le fichier doit avoir l'extension .pdf" };
  }

  // Types MIME valides pour PDF (plus permissif)
  const validPdfTypes = [
    "application/pdf",
    "application/x-pdf",
    "application/acrobat",
    "application/vnd.pdf",
    "text/pdf",
    "text/x-pdf",
  ];

  // Accepter si le type MIME est valide OU si le nom se termine par .pdf
  const hasValidMimeType = validPdfTypes.includes(file.type);
  const hasValidExtension = fileName.endsWith('.pdf');

  if (!hasValidMimeType && !hasValidExtension) {
    return { 
      isValid: false, 
      error: `Type de fichier non valide. Type reçu: ${file.type}. Veuillez utiliser un fichier PDF.` 
    };
  }

  return { isValid: true };
}

async function saveFileToSystem(file: File, commande: any): Promise<string> {
  // Définir le répertoire de stockage
  const facturesDir = path.join(process.cwd(), "public", "factures");
  
  console.log("Ensuring directory exists:", facturesDir);
  await ensureDirectoryExists(facturesDir);

  // Générer un nom de fichier unique
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `facture-${commande.id}-${timestamp}-${uuidv4()}.pdf`;
  const savedFilePath = path.join(facturesDir, fileName);
  const publicPath = `/factures/${fileName}`;

  console.log("File paths:", { 
    facturesDir, 
    fileName, 
    savedFilePath, 
    publicPath,
    originalName: file.name,
    sanitizedName: sanitizedFileName
  });

  try {
    // Convertir le fichier en buffer
    console.log("Converting file to buffer...");
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    if (fileBuffer.length === 0) {
      throw new Error("Buffer vide après conversion du fichier");
    }

    if (fileBuffer.length !== file.size) {
      console.warn(`Taille du buffer (${fileBuffer.length}) différente de la taille du fichier (${file.size})`);
    }

    console.log("Buffer created successfully, size:", fileBuffer.length);

    // Écrire le fichier
    console.log("Writing file to:", savedFilePath);
    await writeFile(savedFilePath, fileBuffer);
    
    // Vérifier que le fichier a été écrit
    await access(savedFilePath, constants.F_OK);
    console.log("File written and verified successfully");

    return publicPath;

  } catch (error) {
    console.error("Erreur lors de l'enregistrement du fichier:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      savedFilePath,
      fileSize: file.size,
      fileName: file.name,
      fileType: file.type,
    });
    
    // Nettoyer le fichier en cas d'erreur
    try {
      await unlink(savedFilePath);
      console.log("Cleaned up failed file:", savedFilePath);
    } catch (unlinkError) {
      console.error("Failed to clean up file:", unlinkError);
    }
    
    throw error;
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let savedFilePath: string | undefined;
  
  try {
    const { id } = await params;

    // Parse FormData
    const formData = await request.formData();
    const statutInput = formData.get("statut") as string;
    const raisonRetour = formData.get("raisonRetour") as string | null;
    const factureFile = formData.get("facture") as File | null;

    console.log("Form data received:", {
      statut: statutInput,
      raisonRetour,
      hasFacture: !!factureFile,
      factureName: factureFile?.name,
      factureSize: factureFile?.size,
      factureType: factureFile?.type,
    });

    // Validation du statut
    const validStatuts: StatutCommande[] = [
      StatutCommande.LIVREE,
      StatutCommande.EN_RETOUR,
      StatutCommande.ANNULEE,
    ];

    if (!statutInput || !Object.values(StatutCommande).includes(statutInput as StatutCommande)) {
      return NextResponse.json(
        { error: "Statut de commande non valide" },
        { status: 400 }
      );
    }

    const statut = statutInput as StatutCommande;
    if (!validStatuts.includes(statut)) {
      return NextResponse.json(
        { error: "Statut de commande non autorisé pour cette mise à jour" },
        { status: 400 }
      );
    }

    // Récupérer la commande
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

    // Préparer les données de mise à jour
    const updateData: {
      statut: StatutCommande;
      facture?: string;
      dateLivraison?: Date;
      raisonRetour?: string | null;
    } = { statut };

    // Traitement du fichier facture
    if (factureFile && statut === StatutCommande.LIVREE) {
      console.log("Processing invoice file...");
      
      // Validation du fichier
      const validation = isValidPdfFile(factureFile);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      try {
        // Sauvegarder le fichier
        const facturePath = await saveFileToSystem(factureFile, commande);
        updateData.facture = facturePath;
        
        // Stocker le chemin pour nettoyage en cas d'erreur
        savedFilePath = path.join(process.cwd(), "public", facturePath);
        
        console.log("Invoice file processed successfully:", facturePath);
        
      } catch (fileError) {
        console.error("Erreur lors du traitement de la facture:", fileError);
        return NextResponse.json(
          {
            error: "Erreur lors de l'enregistrement de la facture",
            details: fileError instanceof Error ? fileError.message : String(fileError),
          },
          { status: 500 }
        );
      }
    }

    // Mise à jour dans une transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (statut === StatutCommande.LIVREE) {
        updateData.dateLivraison = new Date();

        // Mise à jour des stocks
        for (const item of commande.produits) {
          const produit = await tx.produit.findUnique({
            where: { id: item.produitId },
          });

          if (produit) {
            const nouvelleQuantite = produit.quantite + item.quantite;
            let nouveauStatut: StatutProduit;
            
            if (nouvelleQuantite === 0) {
              nouveauStatut = StatutProduit.RUPTURE;
            } else if (nouvelleQuantite <= produit.quantiteMinimale) {
              nouveauStatut = StatutProduit.CRITIQUE;
            } else {
              nouveauStatut = StatutProduit.NORMALE;
            }

            await tx.produit.update({
              where: { id: item.produitId },
              data: {
                quantite: nouvelleQuantite,
                statut: nouveauStatut,
              },
            });

            console.log(`Produit ${item.produitId} mis à jour: ${produit.quantite} + ${item.quantite} = ${nouvelleQuantite}, statut: ${nouveauStatut}`);
          }
        }
      }

      if (statut === StatutCommande.EN_RETOUR) {
        if (!raisonRetour) {
          throw new Error("La raison du retour est requise");
        }
        updateData.raisonRetour = raisonRetour;
        console.log("Raison du retour:", raisonRetour);
      }

      return tx.commande.update({
        where: { id },
        data: updateData,
        include: {
          fournisseur: true,
          produits: {
            include: {
              produit: true,
            },
          },
        },
      });
    });

    console.log("Commande mise à jour avec succès:", updatedOrder.id);

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: "Commande mise à jour avec succès",
    });

  } catch (error) {
    console.error("Erreur générale lors de la mise à jour:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Nettoyage du fichier en cas d'erreur
    if (savedFilePath) {
      try {
        await unlink(savedFilePath);
        console.log("Cleaned up file after error:", savedFilePath);
      } catch (unlinkError) {
        console.error("Failed to clean up file:", unlinkError);
      }
    }
    
    return NextResponse.json(
      {
        error: "Erreur lors de la mise à jour du statut de commande",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}