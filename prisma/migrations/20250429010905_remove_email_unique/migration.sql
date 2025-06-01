/*
  Warnings:

  - The values [PRISE] on the enum `StatutCommande` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatutCommande_new" AS ENUM ('EN_COURS', 'ANNULEE', 'EN_RETOUR', 'LIVREE', 'VALIDE', 'NON_VALIDE');
ALTER TABLE "Commande" ALTER COLUMN "statut" TYPE "StatutCommande_new" USING ("statut"::text::"StatutCommande_new");
ALTER TYPE "StatutCommande" RENAME TO "StatutCommande_old";
ALTER TYPE "StatutCommande_new" RENAME TO "StatutCommande";
DROP TYPE "StatutCommande_old";
COMMIT;

-- AlterEnum
ALTER TYPE "StatutDemande" ADD VALUE 'PRISE';
