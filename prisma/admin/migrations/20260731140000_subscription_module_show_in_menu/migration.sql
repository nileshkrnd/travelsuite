-- Portal modules (B2B, CBT, …) can be excluded from Admin/Super Admin sidebars.
ALTER TABLE "SubscriptionModule"
  ADD COLUMN IF NOT EXISTS "ShowInMenu" BOOLEAN NOT NULL DEFAULT true;
