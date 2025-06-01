-- CreateEnum
CREATE TYPE "ProduitCritere" AS ENUM ('DURABLE', 'CONSOMMABLE');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MAGASINIER';

-- AlterTable
ALTER TABLE "Commande" ADD COLUMN     "facture" TEXT,
ADD COLUMN     "validee" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Produit" ADD COLUMN     "critere" "ProduitCritere" NOT NULL DEFAULT 'DURABLE';
