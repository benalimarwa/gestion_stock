/*
  Warnings:

  - The values [DEMANDEEXCEPT_PRISE] on the enum `ActionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActionType_new" AS ENUM ('COMMANDE_LIVREE', 'COMMANDE_ANNULEE', 'PRODUIT_AJOUTE', 'PRODUIT_MODIFIE', 'PRODUIT_SUPPRIME', 'DEMANDE_PRISE', 'DEMANDE_EXCEPT_PRISE', 'ACCEPT_DEMANDE', 'VALIDE_COMMANDE', 'ACCEPTDEM_EXCEPT');
ALTER TABLE "Registre" ALTER COLUMN "actionType" TYPE "ActionType_new" USING ("actionType"::text::"ActionType_new");
ALTER TABLE "RegistreProduit" ALTER COLUMN "action" TYPE "ActionType_new" USING ("action"::text::"ActionType_new");
ALTER TYPE "ActionType" RENAME TO "ActionType_old";
ALTER TYPE "ActionType_new" RENAME TO "ActionType";
DROP TYPE "ActionType_old";
COMMIT;
