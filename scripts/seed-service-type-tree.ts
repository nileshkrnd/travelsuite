/**
 * Seeds the full Service Type -> Classification tree from the user's diagram.
 * Adds 3 new service types (Tour Guide, Restaurant, Ticket) and classifications
 * for Transfer/Tour/Activity/Visa/Car Hire/Insurance/Package/Tour Guide/
 * Restaurant/Ticket. Additive/upsert only — never deletes existing rows.
 * Run: npx tsx scripts/seed-service-type-tree.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = 1;
const COMPANY_ID = 1;
const CREATED_BY = 1;

const NEW_SERVICE_TYPES: { code: string; name: string; displayOrder: number }[] = [
  { code: "TOUR_GUIDE", name: "Tour Guide", displayOrder: 13 },
  { code: "RESTAURANT", name: "Restaurant", displayOrder: 14 },
  { code: "TICKET", name: "Ticket", displayOrder: 15 },
];

const CLASSIFICATIONS_BY_SERVICE_TYPE: Record<string, { code: string; name: string }[]> = {
  TRANSFER: [
    { code: "AIRPORT_TRANSFER", name: "Airport Transfer" },
    { code: "HOTEL_TRANSFER", name: "Hotel Transfer" },
    { code: "CITY_TRANSFER", name: "City Transfer" },
    { code: "INTERCITY_TRANSFER", name: "Intercity Transfer" },
    { code: "PORT_TRANSFER", name: "Port Transfer" },
  ],
  TOUR: [
    { code: "DAY_TOUR", name: "Day Tour" },
    { code: "HALF_DAY_TOUR", name: "Half Day Tour" },
    { code: "MULTI_DAY_TOUR", name: "Multi Day Tour" },
    { code: "CITY_TOUR", name: "City Tour" },
    { code: "CULTURAL_TOUR", name: "Cultural Tour" },
    { code: "DESERT_TOUR", name: "Desert Tour" },
    { code: "ADVENTURE_TOUR", name: "Adventure Tour" },
  ],
  ACTIVITY: [
    { code: "ADVENTURE", name: "Adventure" },
    { code: "WATER_SPORT", name: "Water Sport" },
    { code: "DESERT_ACTIVITY", name: "Desert Activity" },
    { code: "CULTURAL_ACTIVITY", name: "Cultural Activity" },
    { code: "WELLNESS", name: "Wellness" },
  ],
  VISA: [
    { code: "TOURIST_VISA", name: "Tourist Visa" },
    { code: "BUSINESS_VISA", name: "Business Visa" },
    { code: "TRANSIT_VISA", name: "Transit Visa" },
    { code: "WORK_VISA", name: "Work Visa" },
  ],
  CAR_HIRE: [
    { code: "SELF_DRIVE", name: "Self Drive" },
    { code: "CHAUFFEUR_DRIVEN", name: "Chauffeur Driven" },
    { code: "DAILY_RENTAL", name: "Daily Rental" },
    { code: "LONG_TERM_RENTAL", name: "Long Term Rental" },
  ],
  INSURANCE: [
    { code: "TRAVEL_INSURANCE", name: "Travel Insurance" },
    { code: "MEDICAL_INSURANCE", name: "Medical Insurance" },
    { code: "BAGGAGE_INSURANCE", name: "Baggage Insurance" },
    { code: "TRIP_CANCELLATION", name: "Trip Cancellation" },
  ],
  PACKAGE: [
    { code: "HOLIDAY_PACKAGE", name: "Holiday Package" },
    { code: "FAMILY_PACKAGE", name: "Family Package" },
    { code: "HONEYMOON_PACKAGE", name: "Honeymoon Package" },
    { code: "ADVENTURE_PACKAGE", name: "Adventure Package" },
    { code: "CUSTOM_PACKAGE", name: "Custom Package" },
  ],
  TOUR_GUIDE: [
    { code: "PRIVATE_GUIDE", name: "Private Guide" },
    { code: "GROUP_GUIDE", name: "Group Guide" },
    { code: "CITY_GUIDE", name: "City Guide" },
    { code: "SPECIALIST_GUIDE", name: "Specialist Guide" },
  ],
  RESTAURANT: [
    { code: "RESTAURANT_MEAL", name: "Restaurant Meal" },
    { code: "DINING_EXPERIENCE", name: "Dining Experience" },
    { code: "FINE_DINING", name: "Fine Dining" },
    { code: "BUFFET", name: "Buffet" },
  ],
  TICKET: [
    { code: "MUSEUM_TICKET", name: "Museum Ticket" },
    { code: "ATTRACTION_TICKET", name: "Attraction Ticket" },
    { code: "THEME_PARK_TICKET", name: "Theme Park Ticket" },
    { code: "WATER_PARK_TICKET", name: "Water Park Ticket" },
    { code: "EVENT_TICKET", name: "Event Ticket" },
    { code: "SHOW_TICKET", name: "Show Ticket" },
  ],
};

/** Old code -> new code renames within a service type, applied before the upsert pass. */
const RENAMES_BY_SERVICE_TYPE: Record<string, { from: string; to: string }[]> = {
  ACTIVITY: [{ from: "CULTURAL", to: "CULTURAL_ACTIVITY" }],
};

async function main() {
  for (const item of NEW_SERVICE_TYPES) {
    const row = await prisma.serviceTypeMaster.upsert({
      where: { tenantId_companyId_serviceTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceTypeCode: item.code } },
      create: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceTypeCode: item.code, serviceTypeName: item.name, displayOrder: item.displayOrder, isActive: true, createdBy: CREATED_BY },
      update: { serviceTypeName: item.name, displayOrder: item.displayOrder, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("ServiceType", row.serviceTypeCode, Number(row.serviceTypeId));
  }

  const allTypes = await prisma.serviceTypeMaster.findMany({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID } });
  const typeByCode = new Map(allTypes.map((t) => [t.serviceTypeCode, t]));

  for (const [serviceTypeCode, renames] of Object.entries(RENAMES_BY_SERVICE_TYPE)) {
    const serviceType = typeByCode.get(serviceTypeCode);
    if (!serviceType) continue;
    for (const rename of renames) {
      const existing = await prisma.serviceProductClassificationMaster.findUnique({
        where: { tenantId_companyId_serviceTypeId_classificationCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceTypeId: serviceType.serviceTypeId, classificationCode: rename.from } },
      });
      if (existing) {
        await prisma.serviceProductClassificationMaster.update({
          where: { serviceProductClassificationId: existing.serviceProductClassificationId },
          data: { classificationCode: rename.to, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
        });
        console.log("Renamed", serviceTypeCode, rename.from, "->", rename.to);
      }
    }
  }

  for (const [serviceTypeCode, items] of Object.entries(CLASSIFICATIONS_BY_SERVICE_TYPE)) {
    const serviceType = typeByCode.get(serviceTypeCode);
    if (!serviceType) {
      console.error("Service type not found, skipping:", serviceTypeCode);
      continue;
    }
    for (const [index, item] of items.entries()) {
      const row = await prisma.serviceProductClassificationMaster.upsert({
        where: { tenantId_companyId_serviceTypeId_classificationCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceTypeId: serviceType.serviceTypeId, classificationCode: item.code } },
        create: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceTypeId: serviceType.serviceTypeId, classificationCode: item.code, classificationName: item.name, displayOrder: index, isActive: true, createdBy: CREATED_BY },
        update: { classificationName: item.name, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
      });
      console.log("Classification", serviceTypeCode, "/", row.classificationCode, Number(row.serviceProductClassificationId));
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
