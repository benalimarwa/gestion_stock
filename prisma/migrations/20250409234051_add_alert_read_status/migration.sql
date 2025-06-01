/*
  Warnings:

  - Made the column `description` on table `Alerte` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Alerte" DROP CONSTRAINT "Alerte_produitId_fkey";

-- AlterTable
ALTER TABLE "Alerte" ADD COLUMN     "userEmail" TEXT,
ALTER COLUMN "produitId" DROP NOT NULL,
ALTER COLUMN "date" DROP DEFAULT,
ALTER COLUMN "description" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
