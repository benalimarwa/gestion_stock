-- AlterTable
ALTER TABLE "Demande" ADD COLUMN     "adminId" TEXT;

-- AlterTable
ALTER TABLE "Reporting" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Demande" ADD CONSTRAINT "Demande_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
