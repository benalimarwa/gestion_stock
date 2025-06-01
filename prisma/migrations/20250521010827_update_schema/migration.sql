/*
  Warnings:

  - You are about to drop the column `actionDetails` on the `RegistreProduit` table. All the data in the column will be lost.
  - Added the required column `action` to the `RegistreProduit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RegistreProduit" DROP COLUMN "actionDetails",
ADD COLUMN     "action" "ActionType" NOT NULL;
