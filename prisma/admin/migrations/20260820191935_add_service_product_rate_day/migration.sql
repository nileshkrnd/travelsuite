-- CreateTable
CREATE TABLE "ServiceProductRateDay" (
    "ServiceProductRateDayID" BIGSERIAL NOT NULL,
    "ServiceProductRateID" BIGINT NOT NULL,
    "DayOfWeekID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "ServiceProductRateDay_pkey" PRIMARY KEY ("ServiceProductRateDayID")
);

-- CreateIndex
CREATE INDEX "SvcProductRateDay_DayOfWeekID_idx" ON "ServiceProductRateDay"("DayOfWeekID");

-- CreateIndex
CREATE UNIQUE INDEX "SvcProductRateDay_Rate_Day_key" ON "ServiceProductRateDay"("ServiceProductRateID", "DayOfWeekID");

-- AddForeignKey
ALTER TABLE "ServiceProductRateDay" ADD CONSTRAINT "ServiceProductRateDay_ServiceProductRateID_fkey" FOREIGN KEY ("ServiceProductRateID") REFERENCES "ServiceProductRate"("ServiceProductRateID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProductRateDay" ADD CONSTRAINT "ServiceProductRateDay_DayOfWeekID_fkey" FOREIGN KEY ("DayOfWeekID") REFERENCES "DayOfWeek"("DayOfWeekID") ON DELETE RESTRICT ON UPDATE CASCADE;
