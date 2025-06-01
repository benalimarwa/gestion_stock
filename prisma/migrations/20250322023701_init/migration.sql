-- CreateEnum
CREATE TYPE "StatutProduit" AS ENUM ('NORMALE', 'CRITIQUE', 'RUPTURE');

-- AlterTable
ALTER TABLE "Commande" ADD COLUMN     "dateLivraison" TIMESTAMP(3),
ADD COLUMN     "raisonRetour" TEXT;

-- AlterTable
ALTER TABLE "Demande" ADD COLUMN     "dateApprouvee" TIMESTAMP(3),
ADD COLUMN     "raisonRefus" TEXT;

-- AlterTable
ALTER TABLE "Produit" ADD COLUMN     "marque" TEXT NOT NULL DEFAULT 'Inconnu',
ADD COLUMN     "quantiteMinimale" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "remarque" TEXT,
ADD COLUMN     "statut" "StatutProduit" NOT NULL DEFAULT 'NORMALE';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'DEMANDEUR';
