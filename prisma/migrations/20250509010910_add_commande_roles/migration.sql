/*
  Warnings:

  - The values [PRISE] on the enum `StatutDemandeExceptionnelle` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatutDemandeExceptionnelle_new" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'COMMANDEE', 'LIVREE', 'REJETEE');
ALTER TABLE "DemandeExceptionnelle" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "DemandeExceptionnelle" ALTER COLUMN "statut" TYPE "StatutDemandeExceptionnelle_new" USING ("statut"::text::"StatutDemandeExceptionnelle_new");
ALTER TYPE "StatutDemandeExceptionnelle" RENAME TO "StatutDemandeExceptionnelle_old";
ALTER TYPE "StatutDemandeExceptionnelle_new" RENAME TO "StatutDemandeExceptionnelle";
DROP TYPE "StatutDemandeExceptionnelle_old";
ALTER TABLE "DemandeExceptionnelle" ALTER COLUMN "statut" SET DEFAULT 'EN_ATTENTE';
COMMIT;

-- AlterTable
ALTER TABLE "Commande" ADD COLUMN     "adminId" TEXT,
ADD COLUMN     "gestionnaireId" TEXT,
ADD COLUMN     "magasinierReceivedId" TEXT,
ADD COLUMN     "magasinierRequestedId" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "sentByEmail" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_gestionnaireId_fkey" FOREIGN KEY ("gestionnaireId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_magasinierRequestedId_fkey" FOREIGN KEY ("magasinierRequestedId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_magasinierReceivedId_fkey" FOREIGN KEY ("magasinierReceivedId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
