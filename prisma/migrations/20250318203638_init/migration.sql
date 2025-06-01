/*
  Warnings:

  - The values [USER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `adresseEmail` on the `AdminAchat` table. All the data in the column will be lost.
  - You are about to drop the column `nom` on the `AdminAchat` table. All the data in the column will be lost.
  - You are about to drop the column `adresseEmail` on the `Gestionnaire` table. All the data in the column will be lost.
  - You are about to drop the column `nom` on the `Gestionnaire` table. All the data in the column will be lost.
  - You are about to drop the column `idUtilisateur` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `AdminAchat` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Gestionnaire` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `AdminAchat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Gestionnaire` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DemandeurType" AS ENUM ('EMPLOYE', 'ENSEIGNANT');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('EN_COURS', 'ANNULEE', 'EN_RETOUR', 'LIVREE');

-- CreateEnum
CREATE TYPE "StatutDemande" AS ENUM ('EN_ATTENTE', 'APPROUVEE', 'REJETEE');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'DEMANDEUR', 'MAGASINNAIRE');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'DEMANDEUR';
COMMIT;

-- DropForeignKey
ALTER TABLE "CommandeProduit" DROP CONSTRAINT "CommandeProduit_commandeId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_idUtilisateur_fkey";

-- DropIndex
DROP INDEX "AdminAchat_adresseEmail_key";

-- DropIndex
DROP INDEX "Gestionnaire_adresseEmail_key";

-- AlterTable
ALTER TABLE "AdminAchat" DROP COLUMN "adresseEmail",
DROP COLUMN "nom",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Commande" ADD COLUMN     "statut" "StatutCommande" NOT NULL DEFAULT 'EN_COURS';

-- AlterTable
ALTER TABLE "Gestionnaire" DROP COLUMN "adresseEmail",
DROP COLUMN "nom",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "idUtilisateur",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Reporting" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "type",
ALTER COLUMN "role" SET DEFAULT 'DEMANDEUR';

-- DropEnum
DROP TYPE "UserType";

-- CreateTable
CREATE TABLE "Demandeur" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DemandeurType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demandeur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demande" (
    "id" TEXT NOT NULL,
    "demandeurId" TEXT NOT NULL,
    "statut" "StatutDemande" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeProduit" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,

    CONSTRAINT "DemandeProduit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Demandeur_userId_key" ON "Demandeur"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminAchat_userId_key" ON "AdminAchat"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Gestionnaire_userId_key" ON "Gestionnaire"("userId");

-- AddForeignKey
ALTER TABLE "Demandeur" ADD CONSTRAINT "Demandeur_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAchat" ADD CONSTRAINT "AdminAchat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gestionnaire" ADD CONSTRAINT "Gestionnaire_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeProduit" ADD CONSTRAINT "CommandeProduit_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Demande" ADD CONSTRAINT "Demande_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "Demandeur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeProduit" ADD CONSTRAINT "DemandeProduit_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "Demande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeProduit" ADD CONSTRAINT "DemandeProduit_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
