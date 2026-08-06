-- Supplier Type master — global lookup (DMC, Hotelier, Tour Operator, Transport, Activity Provider, …).
CREATE TABLE "SupplierType" (
    "SupplierTypeID" BIGSERIAL NOT NULL,
    "SupplierTypeName" VARCHAR(150) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedBy" INTEGER NOT NULL,
    "CreatedDateTime" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ModifiedBy" INTEGER,
    "ModifiedDateTime" TIMESTAMPTZ(6),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SupplierType_pkey" PRIMARY KEY ("SupplierTypeID")
);

CREATE UNIQUE INDEX "SupplierType_SupplierTypeName_key" ON "SupplierType"("SupplierTypeName");
