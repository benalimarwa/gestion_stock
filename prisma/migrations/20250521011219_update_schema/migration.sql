/*
  Warnings:

  - You are about to drop the column `quantiteApres` on the `RegistreProduit` table. All the data in the column will be lost.
  - You are about to drop the column `quantiteAvant` on the `RegistreProduit` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RegistreProduit" DROP COLUMN "quantiteApres",
DROP COLUMN "quantiteAvant";
