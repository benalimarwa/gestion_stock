import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { writeFile, mkdir, unlink, access, stat } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { StatutProduit, StatutCommande } from "@prisma/client";
import { constants } from "fs";
import { existsSync } from "fs";

// Version de débogage très détaillée
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("=== DÉBOGAGE DÉTAILLÉ ===");
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

      // Test des permissions système
      console.log("\n--- Test des permissions ---");
      const os = require('os');
      const tempDir = os.tmpdir();
      console.log("Temp directory:", tempDir);
      
      try {
        // Test 1: Vérifier les permissions du dossier temp
        const tempStat = await stat(tempDir);
        console.log("Temp dir permissions:", tempStat.mode.toString(8));
        console.log("Temp dir is directory:", tempStat.isDirectory());
      } catch (tempError) {
        console.error("❌ Cannot access temp directory:", tempError);
      }

      // Test 2: Tester l'écriture dans temp
      const testTempPath = path.join(tempDir, `test-${Date.now()}.txt`);
      try {
        await writeFile(testTempPath, "test content");
        console.log("✅ Temp write successful");
        await unlink(testTempPath);
        console.log("✅ Temp file cleaned up");
      } catch (tempWriteError) {
        console.error("❌ Temp write failed:", {
          message: tempWriteError instanceof Error ? tempWriteError.message : String(tempWriteError),
          code: (tempWriteError as any)?.code,
          errno: (tempWriteError as any)?.errno,
          path: (tempWriteError as any)?.path
        });
      }

      // Test 3: Vérifier le dossier public
      console.log("\n--- Test du dossier public ---");
      const publicDir = path.join(process.cwd(), "public");
      console.log("Public directory path:", publicDir);
      console.log("Public directory exists (sync):", existsSync(publicDir));

      try {
        const publicStat = await stat(publicDir);
        console.log("Public dir permissions:", publicStat.mode.toString(8));
        console.log("Public dir is directory:", publicStat.isDirectory());
      } catch (publicError) {
        console.error("❌ Cannot access public directory:", {
          message: publicError instanceof Error ? publicError.message : String(publicError),
          code: (publicError as any)?.code
        });
        
        // Essayer de créer le dossier public
        try {
          await mkdir(publicDir, { recursive: true });
          console.log("✅ Created public directory");
        } catch (createError) {
          console.error("❌ Cannot create public directory:", createError);
        }
      }

      // Test 4: Créer le dossier factures
      console.log("\n--- Test du dossier factures ---");
      const facturesDir = path.join(publicDir, "factures");
      console.log("Factures directory path:", facturesDir);
      console.log("Factures directory exists (sync):", existsSync(facturesDir));

      try {
        await mkdir(facturesDir, { recursive: true });
        console.log("✅ Factures directory created/exists");
        
        const facturesStat = await stat(facturesDir);
        console.log("Factures dir permissions:", facturesStat.mode.toString(8));
        console.log("Factures dir is directory:", facturesStat.isDirectory());
      } catch (facturesError) {
        console.error("❌ Cannot create factures directory:", {
          message: facturesError instanceof Error ? facturesError.message : String(facturesError),
          code: (facturesError as any)?.code,
          errno: (facturesError as any)?.errno,
          path: (facturesError as any)?.path
        });
        
        return NextResponse.json({
          error: "Impossible de créer le dossier factures",
          details: facturesError instanceof Error ? facturesError.message : String(facturesError),
          code: (facturesError as any)?.code
        }, { status: 500 });
      }

      // Test 5: Préparer le fichier
      console.log("\n--- Préparation du fichier ---");
      let fileBuffer: Buffer;
      try {
        const arrayBuffer = await factureFile.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        
        console.log("File conversion successful:");
        console.log("- Original size:", factureFile.size);
        console.log("- Buffer size:", fileBuffer.length);
        console.log("- Buffer is valid:", fileBuffer.length > 0);
        
        if (fileBuffer.length === 0) {
          throw new Error("Buffer vide après conversion");
        }
        
        if (fileBuffer.length !== factureFile.size) {
          console.warn("⚠️ Size mismatch between file and buffer");
        }
        
      } catch (bufferError) {
        console.error("❌ File buffer conversion failed:", bufferError);
        return NextResponse.json({
          error: "Conversion du fichier échouée",
          details: bufferError instanceof Error ? bufferError.message : String(bufferError)
        }, { status: 500 });
      }

      // Test 6: Écriture du fichier final
      console.log("\n--- Écriture du fichier final ---");
      const timestamp = Date.now();
      const fileName = `facture-${id}-${timestamp}-${uuidv4()}.pdf`;
      const finalPath = path.join(facturesDir, fileName);
      const publicPath = `/factures/${fileName}`;
      
      console.log("Final file paths:", {
        fileName,
        finalPath,
        publicPath
      });

      try {
        await writeFile(finalPath, fileBuffer);
        console.log("✅ File written successfully");
        
        // Vérification finale
        const finalStat = await stat(finalPath);
        console.log("Final file stats:", {
          size: finalStat.size,
          isFile: finalStat.isFile(),
          permissions: finalStat.mode.toString(8)
        });
        
        if (finalStat.size !== fileBuffer.length) {
          console.warn("⚠️ Written file size differs from buffer size");
        }
        
        return NextResponse.json({
          success: true,
          message: "Fichier sauvegardé avec succès",
          data: {
            fileName,
            publicPath,
            size: finalStat.size,
            originalSize: factureFile.size
          }
        });
        
      } catch (writeError) {
        console.error("❌ Final file write failed:", {
          message: writeError instanceof Error ? writeError.message : String(writeError),
          code: (writeError as any)?.code,
          errno: (writeError as any)?.errno,
          path: (writeError as any)?.path,
          finalPath,
          bufferSize: fileBuffer.length
        });
        
        return NextResponse.json({
          error: "Écriture du fichier échouée",
          details: {
            message: writeError instanceof Error ? writeError.message : String(writeError),
            code: (writeError as any)?.code,
            path: finalPath,
            bufferSize: fileBuffer.length
          }
        }, { status: 500 });
      }
    }

    // Si pas de fichier, juste mettre à jour le statut
    console.log("\n--- Mise à jour du statut sans fichier ---");
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
    console.error("❌ Global error:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code
    });
    
    return NextResponse.json({
      error: "Erreur globale",
      details: {
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code
      }
    }, { status: 500 });
  }
}