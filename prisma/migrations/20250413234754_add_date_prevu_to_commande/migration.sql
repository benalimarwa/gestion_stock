/*
  Warnings:

  - You are about to drop the column `dateLivraison` on the `Commande` table. All the data in the column will be lost.
  - You are about to drop the column `dateLivraisonReelle` on the `Commande` table. All the data in the column will be lost.
  - You are about to drop the column `raisonRetour` on the `Commande` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Commande" DROP COLUMN "dateLivraison",
DROP COLUMN "dateLivraisonReelle",
DROP COLUMN "raisonRetour",
ADD COLUMN     "datePrevu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "date" DROP DEFAULT,
ALTER COLUMN "statut" DROP DEFAULT;
