-- AlterTable
ALTER TABLE "DemandeExceptionnelle" ADD COLUMN     "datePrevu" TIMESTAMP(3),
ADD COLUMN     "fournisseurId" TEXT;

-- AddForeignKey
ALTER TABLE "DemandeExceptionnelle" ADD CONSTRAINT "DemandeExceptionnelle_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
