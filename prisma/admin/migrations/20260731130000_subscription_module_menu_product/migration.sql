-- Shared Administration menu → product visibility links
CREATE TABLE IF NOT EXISTS "SubscriptionModuleMenuProduct" (
    "SubscriptionModuleMenuProductID" SERIAL NOT NULL,
    "SubscriptionModuleMenuID" INTEGER NOT NULL,
    "SubscriptionProductID" INTEGER NOT NULL,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDtTm" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDtTm" TIMESTAMPTZ(6),

    CONSTRAINT "SubscriptionModuleMenuProduct_pkey" PRIMARY KEY ("SubscriptionModuleMenuProductID")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionModuleMenuProduct_Menu_Product_key"
  ON "SubscriptionModuleMenuProduct"("SubscriptionModuleMenuID", "SubscriptionProductID");

CREATE INDEX IF NOT EXISTS "SubscriptionModuleMenuProduct_MenuID_idx"
  ON "SubscriptionModuleMenuProduct"("SubscriptionModuleMenuID");

CREATE INDEX IF NOT EXISTS "SubscriptionModuleMenuProduct_ProductID_idx"
  ON "SubscriptionModuleMenuProduct"("SubscriptionProductID");

ALTER TABLE "SubscriptionModuleMenuProduct"
  DROP CONSTRAINT IF EXISTS "SubscriptionModuleMenuProduct_SubscriptionModuleMenuID_fkey";
ALTER TABLE "SubscriptionModuleMenuProduct"
  ADD CONSTRAINT "SubscriptionModuleMenuProduct_SubscriptionModuleMenuID_fkey"
  FOREIGN KEY ("SubscriptionModuleMenuID") REFERENCES "SubscriptionModuleMenu"("SubscriptionModuleMenuID")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubscriptionModuleMenuProduct"
  DROP CONSTRAINT IF EXISTS "SubscriptionModuleMenuProduct_SubscriptionProductID_fkey";
ALTER TABLE "SubscriptionModuleMenuProduct"
  ADD CONSTRAINT "SubscriptionModuleMenuProduct_SubscriptionProductID_fkey"
  FOREIGN KEY ("SubscriptionProductID") REFERENCES "SubscriptionProduct"("SubscriptionProductID")
  ON DELETE RESTRICT ON UPDATE CASCADE;
