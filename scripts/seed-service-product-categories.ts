/**
 * Seeds ServiceProductCategory rows under existing (and a handful of new)
 * classifications, from the user's classification -> category table.
 *
 * Category codes are prefixed with their classification code
 * (`<CLASSIFICATION>__<CATEGORY_SLUG>`) so that repeated category display
 * names under different classifications within the same service type
 * (e.g. "City Guide" under both PRIVATE_GUIDE and GROUP_GUIDE) stay unique —
 * categoryName keeps the clean display name given by the user.
 *
 * Run: npx tsx scripts/seed-service-product-categories.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = 1;
const COMPANY_ID = 1;
const CREATED_BY = 1;

/** Classifications referenced below that don't exist yet from prior seeds. */
const NEW_CLASSIFICATIONS: Record<string, { code: string; name: string }[]> = {
  TRANSFER: [{ code: "STATION_TRANSFER", name: "Station Transfer" }],
  TOUR: [
    { code: "FOOD_TOUR", name: "Food Tour" },
    { code: "NIGHT_TOUR", name: "Night Tour" },
  ],
  ACTIVITY: [{ code: "SPORTS_ACTIVITY", name: "Sports Activity" }],
  VISA: [
    { code: "STUDENT_VISA", name: "Student Visa" },
    { code: "FAMILY_VISA", name: "Family Visa" },
  ],
  CAR_HIRE: [
    { code: "WEEKLY_RENTAL", name: "Weekly Rental" },
    { code: "MONTHLY_RENTAL", name: "Monthly Rental" },
  ],
  INSURANCE: [
    { code: "PERSONAL_ACCIDENT", name: "Personal Accident" },
    { code: "MULTI_TRIP_INSURANCE", name: "Multi Trip Insurance" },
  ],
  PACKAGE: [
    { code: "CULTURAL_PACKAGE", name: "Cultural Package" },
    { code: "CITY_BREAK", name: "City Break" },
    { code: "BEACH_PACKAGE", name: "Beach Package" },
  ],
};

/** classificationCode -> ordered list of category display names. */
const CATEGORIES_BY_CLASSIFICATION: Record<string, string[]> = {
  AIRPORT_TRANSFER: ["Airport Pickup", "Airport Drop-off"],
  HOTEL_TRANSFER: ["Hotel Pickup", "Hotel Drop-off"],
  CITY_TRANSFER: ["Point-to-Point"],
  INTERCITY_TRANSFER: ["City-to-City"],
  PORT_TRANSFER: ["Port Transfer"],
  STATION_TRANSFER: ["Railway Station Transfer"],

  DAY_TOUR: ["Full Day Tour", "Half Day Tour"],
  MULTI_DAY_TOUR: ["2–3 Day Tour", "Extended Tour"],
  CITY_TOUR: ["City Sightseeing", "Walking Tour", "Hop-on Hop-off"],
  CULTURAL_TOUR: ["Heritage Tour", "Historical Tour"],
  DESERT_TOUR: ["Desert Safari", "Dune Bashing", "Desert Camp"],
  ADVENTURE_TOUR: ["Adventure Tour"],
  FOOD_TOUR: ["Food Tour"],
  NIGHT_TOUR: ["Night Tour"],
  PRIVATE_TOUR: ["Private Guided Tour"],
  GROUP_TOUR: ["Group Guided Tour"],

  ADVENTURE: ["Zipline", "Rock Climbing", "Bungee Jumping", "Skydiving"],
  WATER_SPORT: ["Jet Ski", "Parasailing", "Kayaking", "Scuba Diving", "Snorkeling"],
  DESERT_ACTIVITY: ["Camel Riding", "Sandboarding", "Dune Bashing"],
  CULTURAL_ACTIVITY: ["Cultural Experience", "Traditional Experience"],
  WELLNESS: ["Spa", "Massage"],
  SPORTS_ACTIVITY: ["Golf", "Tennis"],

  TOURIST_VISA: ["Single Entry", "Multiple Entry", "Short Stay", "Long Stay"],
  BUSINESS_VISA: ["Single Entry", "Multiple Entry"],
  TRANSIT_VISA: ["Airport Transit", "Transit Visa"],
  STUDENT_VISA: ["Student Visa"],
  WORK_VISA: ["Employment Visa"],
  FAMILY_VISA: ["Family Visit Visa"],

  SELF_DRIVE: ["Economy Car", "Compact Car", "Sedan", "SUV", "Luxury Car", "Van"],
  CHAUFFEUR_DRIVEN: ["Sedan with Driver", "SUV with Driver", "Luxury Car with Driver", "Van with Driver"],
  DAILY_RENTAL: ["Daily Car Rental"],
  WEEKLY_RENTAL: ["Weekly Car Rental"],
  MONTHLY_RENTAL: ["Monthly Car Rental"],
  LONG_TERM_RENTAL: ["Long-Term Car Rental"],

  TRAVEL_INSURANCE: ["Single Trip", "Family Travel", "Senior Travel", "Annual Travel"],
  MEDICAL_INSURANCE: ["International Medical", "Emergency Medical"],
  BAGGAGE_INSURANCE: ["Baggage Protection"],
  TRIP_CANCELLATION: ["Trip Cancellation"],
  PERSONAL_ACCIDENT: ["Personal Accident"],
  MULTI_TRIP_INSURANCE: ["Annual Multi Trip"],

  HOLIDAY_PACKAGE: ["Beach Holiday", "City Holiday", "Adventure Holiday"],
  FAMILY_PACKAGE: ["Family Holiday", "Kids Holiday"],
  HONEYMOON_PACKAGE: ["Honeymoon", "Romantic Getaway"],
  ADVENTURE_PACKAGE: ["Adventure Package"],
  CULTURAL_PACKAGE: ["Cultural Package"],
  CITY_BREAK: ["Weekend Break", "Short City Break"],
  BEACH_PACKAGE: ["Beach Holiday"],
  CUSTOM_PACKAGE: ["Custom Package"],

  PRIVATE_GUIDE: ["City Guide", "Museum Guide", "Cultural Guide", "Historical Guide"],
  GROUP_GUIDE: ["City Guide", "Museum Guide", "Cultural Guide"],
  CITY_GUIDE: ["Walking Guide", "Sightseeing Guide"],
  SPECIALIST_GUIDE: ["Food Guide", "Art Guide", "History Guide"],

  RESTAURANT_MEAL: ["Buffet Restaurant", "Set Menu", "À La Carte", "Casual Dining"],
  DINING_EXPERIENCE: ["Fine Dining", "Rooftop Dining", "Beach Dining", "Themed Dining"],
  FINE_DINING: ["Tasting Menu", "Chef's Table"],
  BUFFET: ["International Buffet", "Seafood Buffet"],

  MUSEUM_TICKET: ["Museum Entry", "Museum Exhibition", "Museum Combo"],
  ATTRACTION_TICKET: ["Attraction Entry", "Observation Deck", "Landmark Entry"],
  THEME_PARK_TICKET: ["Theme Park Entry", "Water Park Entry", "Amusement Park"],
  WATER_PARK_TICKET: ["Water Park Entry", "Water Park Combo"],
  EVENT_TICKET: ["Sports Event", "Concert", "Festival"],
  SHOW_TICKET: ["Theatre Show", "Live Show", "Cultural Show"],
};

function stripDiacritics(input: string): string {
  return [...input.normalize("NFKD")]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return !(code >= 0x0300 && code <= 0x036f);
    })
    .join("");
}

function slug(name: string): string {
  return stripDiacritics(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function main() {
  // 1) Ensure any missing classifications exist.
  for (const [serviceTypeCode, items] of Object.entries(NEW_CLASSIFICATIONS)) {
    const serviceType = await prisma.serviceTypeMaster.findUnique({
      where: { tenantId_companyId_serviceTypeCode: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceTypeCode } },
    });
    if (!serviceType) {
      console.error("Service type not found, skipping classifications for:", serviceTypeCode);
      continue;
    }
    const existingCount = await prisma.serviceProductClassificationMaster.count({
      where: { tenantId: TENANT_ID, companyId: COMPANY_ID, serviceTypeId: serviceType.serviceTypeId },
    });
    for (const [i, item] of items.entries()) {
      const row = await prisma.serviceProductClassificationMaster.upsert({
        where: {
          tenantId_companyId_serviceTypeId_classificationCode: {
            tenantId: TENANT_ID,
            companyId: COMPANY_ID,
            serviceTypeId: serviceType.serviceTypeId,
            classificationCode: item.code,
          },
        },
        create: {
          tenantId: TENANT_ID,
          companyId: COMPANY_ID,
          serviceTypeId: serviceType.serviceTypeId,
          classificationCode: item.code,
          classificationName: item.name,
          displayOrder: existingCount + i,
          isActive: true,
          createdBy: CREATED_BY,
        },
        update: { classificationName: item.name, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
      });
      console.log("Classification (new)", serviceTypeCode, "/", row.classificationCode, Number(row.serviceProductClassificationId));
    }
  }

  // 2) Load every classification (existing + just-created) keyed by code.
  const allClassifications = await prisma.serviceProductClassificationMaster.findMany({
    where: { tenantId: TENANT_ID, companyId: COMPANY_ID },
  });
  const classificationByCode = new Map(allClassifications.map((c) => [c.classificationCode, c]));

  // 3) Upsert categories.
  let created = 0;
  let skipped = 0;
  for (const [classificationCode, categoryNames] of Object.entries(CATEGORIES_BY_CLASSIFICATION)) {
    const classification = classificationByCode.get(classificationCode);
    if (!classification) {
      console.error("Classification not found, skipping categories for:", classificationCode);
      skipped += categoryNames.length;
      continue;
    }
    for (const [index, categoryName] of categoryNames.entries()) {
      const categoryCode = `${classificationCode}__${slug(categoryName)}`;
      const row = await prisma.serviceProductCategory.upsert({
        where: {
          tenantId_companyId_serviceTypeId_categoryCode: {
            tenantId: TENANT_ID,
            companyId: COMPANY_ID,
            serviceTypeId: classification.serviceTypeId,
            categoryCode,
          },
        },
        create: {
          tenantId: TENANT_ID,
          companyId: COMPANY_ID,
          serviceTypeId: classification.serviceTypeId,
          serviceProductClassificationId: classification.serviceProductClassificationId,
          categoryCode,
          categoryName,
          displayOrder: index,
          isActive: true,
          createdBy: CREATED_BY,
        },
        update: {
          serviceProductClassificationId: classification.serviceProductClassificationId,
          categoryName,
          displayOrder: index,
          modifiedBy: CREATED_BY,
          modifiedDtTm: new Date(),
        },
      });
      created += 1;
      console.log("Category", classificationCode, "/", row.categoryCode, Number(row.serviceProductCategoryId));
    }
  }

  console.log(`Done. ${created} categories upserted, ${skipped} skipped (missing classification).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
