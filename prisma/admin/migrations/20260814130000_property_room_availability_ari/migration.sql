-- Daily ARI overrides on availability rows (rate + inventory per day).

ALTER TABLE "PropertyRoomAvailability"
    ADD COLUMN "DailyRateAmount" DECIMAL(18, 4),
    ADD COLUMN "DailyInventoryQty" INTEGER;
