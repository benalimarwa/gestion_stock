import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { StatutCommande } from "@prisma/client";

// === SOLUTION 1: Stockage en base de données (Recommandé) ===
export async function PUT_DATABASE_STORAGE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const statutInput = formData.get("statut") as string;
    const factureFile = formData.get("facture") as File | null;

    console.log("Processing order:", id);
    console.log("Status:", statutInput);
    console.log("Has file:", !!factureFile);

    let factureData = null;

    if (factureFile) {
      // Validation du fichier
      const validation = isValidPdfFile(factureFile);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      // Convertir le fichier en base64 pour stockage en DB
      const arrayBuffer = await factureFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');

      factureData = {
        fileName: factureFile.name,
        fileType: factureFile.type,
        fileSize: factureFile.size,
        fileData: base64Data, // Stockage en base64
        uploadDate: new Date()
      };

      console.log("File converted to base64, size:", base64Data.length);
    }

    // Mettre à jour la commande
    const updatedOrder = await prisma.commande.update({
      where: { id },
      data: {
        statut: statutInput as StatutCommande,
        ...(factureData && {
          facture: factureData.fileName,
          factureData: JSON.stringify(factureData) // Stocker toutes les données
        })
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: factureFile ? "Commande et facture mises à jour" : "Statut mis à jour"
    });

  } catch (error) {
    console.error("Database storage error:", error);
    return NextResponse.json({
      error: "Erreur lors de la mise à jour",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// === SOLUTION 2: Stockage dans le dossier tmp (Temporaire) ===
export async function PUT_TMP_STORAGE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const statutInput = formData.get("statut") as string;
    const factureFile = formData.get("facture") as File | null;

    let facturePath = null;

    if (factureFile) {
      const validation = isValidPdfFile(factureFile);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      // Utiliser le dossier temporaire du système
      const os = require('os');
      const tmpDir = path.join(os.tmpdir(), 'factures');
      
      try {
        await mkdir(tmpDir, { recursive: true });
        console.log("Temp directory created:", tmpDir);
      } catch (mkdirError) {
        console.error("Cannot create temp directory:", mkdirError);
        throw new Error("Impossible de créer le dossier temporaire");
      }

      // Sauvegarder le fichier
      const fileName = `facture-${id}-${Date.now()}-${uuidv4()}.pdf`;
      const tempFilePath = path.join(tmpDir, fileName);
      
      const arrayBuffer = await factureFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      await writeFile(tempFilePath, buffer);
      facturePath = tempFilePath;
      
      console.log("File saved to temp:", tempFilePath);
    }

    // Mettre à jour la commande
    const updatedOrder = await prisma.commande.update({
      where: { id },
      data: {
        statut: statutInput as StatutCommande,
        ...(facturePath && { facture: facturePath })
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: factureFile ? "Commande et facture mises à jour" : "Statut mis à jour"
    });

  } catch (error) {
    console.error("Temp storage error:", error);
    return NextResponse.json({
      error: "Erreur lors de la mise à jour",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// === SOLUTION 3: Créer manuellement le dossier public ===
export async function PUT_MANUAL_DIRECTORY(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const statutInput = formData.get("statut") as string;
    const factureFile = formData.get("facture") as File | null;

    let facturePath = null;

    if (factureFile) {
      const validation = isValidPdfFile(factureFile);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      // Créer le chemin complet étape par étape
      const rootDir = process.cwd();
      const publicDir = path.join(rootDir, "public");
      const facturesDir = path.join(publicDir, "factures");
      
      console.log("Creating directories step by step:");
      console.log("Root:", rootDir);
      console.log("Public:", publicDir);
      console.log("Factures:", facturesDir);

      try {
        // Créer public d'abord
        await mkdir(publicDir, { recursive: true });
        console.log("✅ Public directory OK");
        
        // Puis factures
        await mkdir(facturesDir, { recursive: true });
        console.log("✅ Factures directory OK");
        
      } catch (mkdirError) {
        console.error("Directory creation failed:", mkdirError);
        
        // Fallback: utiliser un dossier uploads à la racine
        const uploadsDir = path.join(rootDir, "uploads");
        console.log("Trying fallback directory:", uploadsDir);
        
        try {
          await mkdir(uploadsDir, { recursive: true });
          console.log("✅ Uploads directory created");
          
          const fileName = `facture-${id}-${Date.now()}-${uuidv4()}.pdf`;
          const filePath = path.join(uploadsDir, fileName);
          
          const arrayBuffer = await factureFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          await writeFile(filePath, buffer);
          facturePath = `/uploads/${fileName}`;
          
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
          throw new Error("Impossible de créer un dossier de stockage");
        }
      }

      // Si les dossiers ont été créés avec succès
      if (!facturePath) {
        const fileName = `facture-${id}-${Date.now()}-${uuidv4()}.pdf`;
        const filePath = path.join(facturesDir, fileName);
        
        const arrayBuffer = await factureFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        await writeFile(filePath, buffer);
        facturePath = `/factures/${fileName}`;
      }
    }

    // Mettre à jour la commande
    const updatedOrder = await prisma.commande.update({
      where: { id },
      data: {
        statut: statutInput as StatutCommande,
        ...(facturePath && { facture: facturePath })
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: factureFile ? "Commande et facture mises à jour" : "Statut mis à jour"
    });

  } catch (error) {
    console.error("Manual directory error:", error);
    return NextResponse.json({
      error: "Erreur lors de la mise à jour",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// === SOLUTION 4: Version hybride (Recommandée pour production) ===
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const statutInput = formData.get("statut") as string;
    const factureFile = formData.get("facture") as File | null;

    console.log("Processing order:", id);
    console.log("Status:", statutInput);
    console.log("Has file:", !!factureFile);

    let factureData = null;

    if (factureFile) {
      // Validation du fichier
      const validation = isValidPdfFile(factureFile);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      // Convertir le fichier
      const arrayBuffer = await factureFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Essayer d'abord le stockage fichier, sinon base de données
      let facturePath = null;
      let useDatabase = false;

      try {
        // Tentative de stockage fichier
        const facturesDir = path.join(process.cwd(), "public", "factures");
        await mkdir(facturesDir, { recursive: true });
        
        const fileName = `facture-${id}-${Date.now()}-${uuidv4()}.pdf`;
        const filePath = path.join(facturesDir, fileName);
        
        await writeFile(filePath, buffer);
        facturePath = `/factures/${fileName}`;
        console.log("✅ File saved to filesystem:", facturePath);
        
      } catch (fileError) {
        console.log("❌ Filesystem storage failed, using database:", fileError);
        useDatabase = true;
        
        // Stockage en base de données
        const base64Data = buffer.toString('base64');
        factureData = {
          fileName: factureFile.name,
          fileType: factureFile.type,
          fileSize: factureFile.size,
          fileData: base64Data,
          uploadDate: new Date()
        };
        
        facturePath = `data:${factureFile.type};base64,${base64Data}`;
      }
    }

    // Mettre à jour la commande
    const updateData: any = {
      statut: statutInput as StatutCommande
    };

    if (factureFile) {
      updateData.facture = factureFile.name;
      if (factureData) {
        updateData.factureData = JSON.stringify(factureData);
      }
    }

    const updatedOrder = await prisma.commande.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: factureFile ? "Commande et facture mises à jour" : "Statut mis à jour",
      storageMethod: factureFile ? (factureData ? "database" : "filesystem") : "none"
    });

  } catch (error) {
    console.error("Hybrid storage error:", error);
    return NextResponse.json({
      error: "Erreur lors de la mise à jour",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Fonction de validation (commune à toutes les solutions)
function isValidPdfFile(file: File): { isValid: boolean; error?: string } {
  if (file.size === 0) {
    return { isValid: false, error: "Le fichier facture est vide" };
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { isValid: false, error: "Le fichier est trop volumineux (max 10MB)" };
  }

  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.pdf')) {
    return { isValid: false, error: "Le fichier doit avoir l'extension .pdf" };
  }

  return { isValid: true };
}