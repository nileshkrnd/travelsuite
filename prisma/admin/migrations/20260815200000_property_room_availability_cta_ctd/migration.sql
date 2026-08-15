-- Daily closed-to-arrival / closed-to-departure restrictions on availability rows.

ALTER TABLE "PropertyRoomAvailability"
    ADD COLUMN "ClosedToArrival" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "ClosedToDeparture" BOOLEAN NOT NULL DEFAULT false;
