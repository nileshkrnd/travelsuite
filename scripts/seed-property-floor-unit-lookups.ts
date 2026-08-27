/**
 * Seeds FloorType, UnitType, UnitCategory, UnitStatus, FurnishedStatus, and SQM/SQFT.
 * Run: npx tsx scripts/seed-property-floor-unit-lookups.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CREATED_BY = 1;

const FLOOR_TYPES = [
  { code: "BASEMENT", name: "Basement" },
  { code: "PARKING", name: "Parking" },
  { code: "GROUND", name: "Ground" },
  { code: "MEZZANINE", name: "Mezzanine" },
  { code: "NORMAL", name: "Normal" },
  { code: "PENTHOUSE", name: "Penthouse" },
  { code: "ROOF", name: "Roof" },
  { code: "OTHER", name: "Other" },
];

const UNIT_TYPES = [
  { code: "APARTMENT", name: "Apartment" },
  { code: "OFFICE", name: "Office" },
  { code: "SHOP", name: "Shop" },
  { code: "VILLA", name: "Villa" },
  { code: "WAREHOUSE", name: "Warehouse" },
  { code: "RETAIL_SPACE", name: "Retail Space" },
  { code: "PARKING", name: "Parking" },
  { code: "STORAGE", name: "Storage" },
  { code: "OTHER", name: "Other" },
];

const UNIT_CATEGORIES = [
  { code: "STUDIO", name: "Studio" },
  { code: "1BR", name: "1 Bedroom" },
  { code: "2BR", name: "2 Bedroom" },
  { code: "3BR", name: "3 Bedroom" },
  { code: "4BR", name: "4 Bedroom" },
  { code: "PENTHOUSE", name: "Penthouse" },
  { code: "DUPLEX", name: "Duplex" },
  { code: "OTHER", name: "Other" },
];

const UNIT_STATUSES = [
  { code: "AVAILABLE", name: "Available" },
  { code: "OCCUPIED", name: "Occupied" },
  { code: "RESERVED", name: "Reserved" },
  { code: "MAINTENANCE", name: "Maintenance" },
  { code: "BLOCKED", name: "Blocked" },
  { code: "UNDER_RENOVATION", name: "Under Renovation" },
  { code: "SOLD", name: "Sold" },
  { code: "INACTIVE", name: "Inactive" },
];

const FURNISHED_STATUSES = [
  { code: "FURNISHED", name: "Furnished" },
  { code: "SEMI_FURNISHED", name: "Semi Furnished" },
  { code: "UNFURNISHED", name: "Unfurnished" },
];

async function main() {
  for (const [index, seed] of FLOOR_TYPES.entries()) {
    const row = await prisma.floorType.upsert({
      where: { floorTypeCode: seed.code },
      create: {
        floorTypeCode: seed.code,
        floorTypeName: seed.name,
        displayOrder: index + 1,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: { floorTypeName: seed.name, displayOrder: index + 1, isActive: true },
    });
    console.log("FloorType", row.floorTypeCode, Number(row.floorTypeId));
  }

  for (const [index, seed] of UNIT_TYPES.entries()) {
    const row = await prisma.unitType.upsert({
      where: { unitTypeCode: seed.code },
      create: {
        unitTypeCode: seed.code,
        unitTypeName: seed.name,
        displayOrder: index + 1,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: { unitTypeName: seed.name, displayOrder: index + 1, isActive: true },
    });
    console.log("UnitType", row.unitTypeCode, Number(row.unitTypeId));
  }

  for (const [index, seed] of UNIT_CATEGORIES.entries()) {
    const row = await prisma.unitCategory.upsert({
      where: { unitCategoryCode: seed.code },
      create: {
        unitCategoryCode: seed.code,
        unitCategoryName: seed.name,
        displayOrder: index + 1,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: { unitCategoryName: seed.name, displayOrder: index + 1, isActive: true },
    });
    console.log("UnitCategory", row.unitCategoryCode, Number(row.unitCategoryId));
  }

  for (const [index, seed] of UNIT_STATUSES.entries()) {
    const row = await prisma.unitStatus.upsert({
      where: { statusCode: seed.code },
      create: {
        statusCode: seed.code,
        statusName: seed.name,
        displayOrder: index + 1,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: { statusName: seed.name, displayOrder: index + 1, isActive: true },
    });
    console.log("UnitStatus", row.statusCode, Number(row.unitStatusId));
  }

  for (const [index, seed] of FURNISHED_STATUSES.entries()) {
    const row = await prisma.furnishedStatus.upsert({
      where: { furnishedStatusCode: seed.code },
      create: {
        furnishedStatusCode: seed.code,
        furnishedStatusName: seed.name,
        displayOrder: index + 1,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: { furnishedStatusName: seed.name, displayOrder: index + 1, isActive: true },
    });
    console.log("FurnishedStatus", row.furnishedStatusCode, Number(row.furnishedStatusId));
  }

  for (const [index, seed] of [
    { code: "SQM", name: "Square Metre" },
    { code: "SQFT", name: "Square Foot" },
  ].entries()) {
    const row = await prisma.roomSizeUnit.upsert({
      where: { roomSizeUnitCode: seed.code },
      create: {
        roomSizeUnitCode: seed.code,
        roomSizeUnitName: seed.name,
        displayOrder: index + 1,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: { roomSizeUnitName: seed.name, isActive: true },
    });
    console.log("RoomSizeUnit", row.roomSizeUnitCode, Number(row.roomSizeUnitId));
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
