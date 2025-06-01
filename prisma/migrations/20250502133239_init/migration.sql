-- CreateEnum
CREATE TYPE "StatutDemandeExceptionnelle" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'COMMANDEE', 'LIVREE', 'PRISE');

-- CreateTable
CREATE TABLE "ProduitExceptionnel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "marque" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProduitExceptionnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeExceptionnelle" (
    "id" TEXT NOT NULL,
    "demandeurId" TEXT NOT NULL,
    "statut" "StatutDemandeExceptionnelle" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateApprouvee" TIMESTAMP(3),
    "raisonRefus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeExceptionnelle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeProduitExceptionnel" (
    "id" TEXT NOT NULL,
    "demandeExceptionnelleId" TEXT NOT NULL,
    "produitExceptionnelId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "isOrdered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DemandeProduitExceptionnel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DemandeExceptionnelle" ADD CONSTRAINT "DemandeExceptionnelle_demandeurId_fkey" FOREIGN KEY ("demandeurId") REFERENCES "Demandeur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeProduitExceptionnel" ADD CONSTRAINT "DemandeProduitExceptionnel_demandeExceptionnelleId_fkey" FOREIGN KEY ("demandeExceptionnelleId") REFERENCES "DemandeExceptionnelle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeProduitExceptionnel" ADD CONSTRAINT "DemandeProduitExceptionnel_produitExceptionnelId_fkey" FOREIGN KEY ("produitExceptionnelId") REFERENCES "ProduitExceptionnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
