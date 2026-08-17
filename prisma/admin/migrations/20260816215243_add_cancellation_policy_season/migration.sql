-- AlterTable
ALTER TABLE "PropertyContractCancellationPolicy" ADD COLUMN     "PropertySeasonID" BIGINT;

-- CreateIndex
CREATE INDEX "PropertyContractCancellationPolicy_PropertySeasonID_idx" ON "PropertyContractCancellationPolicy"("PropertySeasonID");

-- AddForeignKey
ALTER TABLE "PropertyContractCancellationPolicy" ADD CONSTRAINT "PropertyContractCancellationPolicy_PropertySeasonID_fkey" FOREIGN KEY ("PropertySeasonID") REFERENCES "PropertySeason"("PropertySeasonID") ON DELETE RESTRICT ON UPDATE CASCADE;
