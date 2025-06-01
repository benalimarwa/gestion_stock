import { PrismaClient } from '@prisma/client';

// Avoid creating multiple PrismaClient instances during hot-reloading
// Extend the globalThis interface to include the prisma property
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}
console.log("Initialisation de PrismaClient...");
console.log("Database URL:", process.env.DATABASE_URL?.substring(0, 25) + "..." || "Non définie");

// Create a new PrismaClient instance with detailed logging
const prisma = global.prisma || new PrismaClient({
  log: ["query", "info", "warn", "error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Error handling for the initial connection
async function initializePrisma() {
  try {
    console.log("Tentative de connexion à la base de données...");
    await prisma.$connect();
    console.log("Connexion à la base de données établie avec succès");
    
    // Test query to verify connection
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log("Test de requête réussi:", result);
    
    return true;
  } catch (error) {
    console.error("Erreur lors de la connexion à la base de données:", error);
    
   
    
    throw error;
  }
}

// Only call initializePrisma in development to avoid unnecessary calls in production
if (process.env.NODE_ENV !== 'production') {
  if (!global.prisma) {
    global.prisma = prisma;
    initializePrisma().catch((err) => {
      console.error("Échec de l'initialisation de Prisma:", err);
      // Don't exit immediately in development - just log the error
      console.error("L'application continuera mais les fonctionnalités de base de données ne fonctionneront pas.");
    });
  }
} else {
  // In production, let the error propagate
  initializePrisma().catch((err) => {
    console.error("Échec de l'initialisation de Prisma en production:", err);
    throw err;
  });
}

export default prisma;