-- CreateTable
CREATE TABLE "ProduitFournisseur" (
    "id" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProduitFournisseur_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProduitFournisseur" ADD CONSTRAINT "ProduitFournisseur_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduitFournisseur" ADD CONSTRAINT "ProduitFournisseur_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
