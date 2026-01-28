-- AlterTable
ALTER TABLE "Provider" ADD COLUMN "subdomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Provider_subdomain_key" ON "Provider"("subdomain");
