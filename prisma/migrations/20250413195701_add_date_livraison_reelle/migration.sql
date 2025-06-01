/*
  Warnings:

  - You are about to drop the column `userEmail` on the `Alerte` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Alerte" DROP COLUMN "userEmail";

-- AlterTable
ALTER TABLE "Commande" ADD COLUMN     "dateLivraisonReelle" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Fournisseur" ADD COLUMN     "score" DOUBLE PRECISION;
