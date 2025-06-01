/*
  Warnings:

  - The values [MAGASINNIER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('COMMANDE_LIVREE', 'COMMANDE_ANNULEE', 'PRODUIT_MODIFIE', 'PRODUIT_SUPPRIME', 'DEMANDE_PRISE');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'DEMANDEUR', 'GESTIONNAIRE', 'MAGASINIER', 'UNDEFINED');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
COMMIT;

-- CreateTable
CREATE TABLE "Registre" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistreProduit" (
    "id" TEXT NOT NULL,
    "registreId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "quantiteAvant" INTEGER,
    "quantiteApres" INTEGER,
    "actionDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistreProduit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Registre" ADD CONSTRAINT "Registre_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistreProduit" ADD CONSTRAINT "RegistreProduit_registreId_fkey" FOREIGN KEY ("registreId") REFERENCES "Registre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistreProduit" ADD CONSTRAINT "RegistreProduit_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
