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
// Version de test temporaire - remplacez votre fonction PUT par celle-ci
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("=== TEST VERSION ===");
    console.log("Order ID:", id);
    console.log("Process CWD:", process.cwd());
    console.log("Node version:", process.version);
    console.log("Platform:", process.platform);

    // Parse FormData
    const formData = await request.formData();
    const statutInput = formData.get("statut") as string;
    const factureFile = formData.get("facture") as File | null;

    console.log("Status:", statutInput);
    console.log("Has file:", !!factureFile);

    if (factureFile) {
      console.log("File details:", {
        name: factureFile.name,
        size: factureFile.size,
        type: factureFile.type
      });

      // Test simple d'écriture dans le dossier temporaire
      const os = require('os');
      const tempDir = os.tmpdir();
      const testPath = path.join(tempDir, `test-${Date.now()}.pdf`);
      
      console.log("Testing write to temp:", testPath);
      
      try {
        const buffer = Buffer.from(await factureFile.arrayBuffer());
        await writeFile(testPath, buffer);
        console.log("✅ Temp write successful");
        
        // Nettoyage
        await unlink(testPath);
        console.log("✅ Temp file cleaned up");
        
        // Maintenant tester dans public
        const publicDir = path.join(process.cwd(), "public");
        const facturesDir = path.join(publicDir, "factures");
        
        console.log("Public dir:", publicDir);
        console.log("Factures dir:", facturesDir);
        
        // Créer le dossier
        await mkdir(facturesDir, { recursive: true });
        console.log("✅ Directory created/exists");
        
        // Écrire le fichier
        const finalPath = path.join(facturesDir, `test-${Date.now()}.pdf`);
        await writeFile(finalPath, buffer);
        console.log("✅ File written to public/factures");
        
        // Pour ce test, on ne supprime pas le fichier pour vérification
        
        return NextResponse.json({
          success: true,
          message: "Test réussi - fichier sauvegardé",
          testPath: finalPath
        });
        
      } catch (fileError) {
        console.error("❌ File operation failed:", fileError);
        return NextResponse.json({
          error: "Test d'écriture échoué",
          details: fileError instanceof Error ? fileError.message : String(fileError)
        }, { status: 500 });
      }
    }

    // Si pas de fichier, juste tester la mise à jour du statut
    const commande = await prisma.commande.findUnique({
      where: { id }
    });

    if (!commande) {
      return NextResponse.json({ error: "Commande non trouvée" }, { status: 404 });
    }

    const updatedOrder = await prisma.commande.update({
      where: { id },
      data: { statut: statutInput as StatutCommande }
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: "Statut mis à jour (sans fichier)"
    });

  } catch (error) {
    console.error("❌ Test error:", error);
    return NextResponse.json({
      error: "Erreur de test",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}