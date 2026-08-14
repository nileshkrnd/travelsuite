-- CreateTable
CREATE TABLE "DayOfWeek" (
    "DayOfWeekID" BIGSERIAL NOT NULL,
    "DayOfWeekCode" VARCHAR(10) NOT NULL,
    "DayOfWeekName" VARCHAR(20) NOT NULL,
    "ShortName" VARCHAR(3) NOT NULL,
    "DisplayOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL DEFAULT 1,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "DayOfWeek_pkey" PRIMARY KEY ("DayOfWeekID")
);

-- CreateTable
CREATE TABLE "PropertyContractRateDay" (
    "PropertyContractRateDayID" BIGSERIAL NOT NULL,
    "PropertyContractRateID" BIGINT NOT NULL,
    "DayOfWeekID" BIGINT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "PropertyContractRateDay_pkey" PRIMARY KEY ("PropertyContractRateDayID")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayOfWeek_DayOfWeekCode_key" ON "DayOfWeek"("DayOfWeekCode");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyContractRateDay_Rate_Day_key" ON "PropertyContractRateDay"("PropertyContractRateID", "DayOfWeekID");

-- CreateIndex
CREATE INDEX "PropertyContractRateDay_PropertyContractRateID_idx" ON "PropertyContractRateDay"("PropertyContractRateID");

-- CreateIndex
CREATE INDEX "PropertyContractRateDay_DayOfWeekID_idx" ON "PropertyContractRateDay"("DayOfWeekID");

-- AddForeignKey
ALTER TABLE "PropertyContractRateDay" ADD CONSTRAINT "PropertyContractRateDay_PropertyContractRateID_fkey" FOREIGN KEY ("PropertyContractRateID") REFERENCES "PropertyContractRate"("PropertyContractRateID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyContractRateDay" ADD CONSTRAINT "PropertyContractRateDay_DayOfWeekID_fkey" FOREIGN KEY ("DayOfWeekID") REFERENCES "DayOfWeek"("DayOfWeekID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed Monday–Sunday (ISO order Mon=1 … Sun=7)
INSERT INTO "DayOfWeek" ("DayOfWeekCode", "DayOfWeekName", "ShortName", "DisplayOrder", "CreatedBy")
VALUES
  ('MON', 'Monday', 'Mon', 1, 1),
  ('TUE', 'Tuesday', 'Tue', 2, 1),
  ('WED', 'Wednesday', 'Wed', 3, 1),
  ('THU', 'Thursday', 'Thu', 4, 1),
  ('FRI', 'Friday', 'Fri', 5, 1),
  ('SAT', 'Saturday', 'Sat', 6, 1),
  ('SUN', 'Sunday', 'Sun', 7, 1)
ON CONFLICT ("DayOfWeekCode") DO NOTHING;
