/**
 * Seeds the global ServiceProductLocationType lookup (Destination, Pickup, Drop-off, …).
 * Run: npx tsx scripts/seed-service-product-location-types.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CREATED_BY = 1;

const LOCATION_TYPES: {
  code: string;
  name: string;
  isPickupLocation?: boolean;
  isDropoffLocation?: boolean;
  isMeetingPoint?: boolean;
  isDestination?: boolean;
}[] = [
  { code: "DESTINATION", name: "Destination", isDestination: true },
  { code: "SERVICE_AREA", name: "Service Area" },
  { code: "PICKUP", name: "Pickup", isPickupLocation: true },
  { code: "DROPOFF", name: "Drop-off", isDropoffLocation: true },
  { code: "MEETING_POINT", name: "Meeting Point", isMeetingPoint: true },
  { code: "START_POINT", name: "Start Point", isPickupLocation: true },
  { code: "END_POINT", name: "End Point", isDropoffLocation: true },
  { code: "DEPARTURE", name: "Departure", isPickupLocation: true },
  { code: "ARRIVAL", name: "Arrival", isDropoffLocation: true },
  { code: "ATTRACTION", name: "Attraction", isDestination: true },
  { code: "VENUE", name: "Venue", isDestination: true },
  { code: "RESTAURANT", name: "Restaurant" },
  { code: "AIRPORT", name: "Airport", isPickupLocation: true, isDropoffLocation: true },
  { code: "PORT", name: "Port", isPickupLocation: true, isDropoffLocation: true },
  { code: "STATION", name: "Station", isPickupLocation: true, isDropoffLocation: true },
  { code: "HOTEL", name: "Hotel", isPickupLocation: true, isDropoffLocation: true },
  { code: "SUPPLIER_OFFICE", name: "Supplier Office", isMeetingPoint: true },
  { code: "OTHER", name: "Other" },
];

async function main() {
  for (const [index, item] of LOCATION_TYPES.entries()) {
    const row = await prisma.serviceProductLocationType.upsert({
      where: { locationTypeCode: item.code },
      create: {
        locationTypeCode: item.code,
        locationTypeName: item.name,
        isPickupLocation: item.isPickupLocation ?? false,
        isDropoffLocation: item.isDropoffLocation ?? false,
        isMeetingPoint: item.isMeetingPoint ?? false,
        isDestination: item.isDestination ?? false,
        displayOrder: index,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: {
        locationTypeName: item.name,
        isPickupLocation: item.isPickupLocation ?? false,
        isDropoffLocation: item.isDropoffLocation ?? false,
        isMeetingPoint: item.isMeetingPoint ?? false,
        isDestination: item.isDestination ?? false,
        displayOrder: index,
        modifiedBy: CREATED_BY,
        modifiedDtTm: new Date(),
      },
    });
    console.log("ServiceProductLocationType", row.locationTypeCode, Number(row.serviceProductLocationTypeId));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
