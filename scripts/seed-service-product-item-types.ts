/**
 * Seeds the global ServiceProductItemType lookup (Transport, Meal, Ticket, Guide, …).
 * Run: npx tsx scripts/seed-service-product-item-types.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CREATED_BY = 1;

const ITEM_TYPES: { code: string; name: string }[] = [
  { code: "TRANSPORT", name: "Transport" },
  { code: "TRANSFER", name: "Transfer" },
  { code: "VEHICLE", name: "Vehicle" },
  { code: "DRIVER", name: "Driver" },
  { code: "GUIDE", name: "Guide" },
  { code: "AUDIO_GUIDE", name: "Audio Guide" },
  { code: "MEAL", name: "Meal" },
  { code: "BREAKFAST", name: "Breakfast" },
  { code: "LUNCH", name: "Lunch" },
  { code: "DINNER", name: "Dinner" },
  { code: "DRINK", name: "Drink" },
  { code: "TICKET", name: "Ticket" },
  { code: "ENTRY_TICKET", name: "Entry Ticket" },
  { code: "ATTRACTION_ENTRY", name: "Attraction Entry" },
  { code: "ACTIVITY", name: "Activity" },
  { code: "EQUIPMENT", name: "Equipment" },
  { code: "PICKUP", name: "Pickup" },
  { code: "DROPOFF", name: "Drop-off" },
  { code: "TAX", name: "Tax" },
  { code: "SERVICE_CHARGE", name: "Service Charge" },
  { code: "GRATUITY", name: "Gratuity" },
  { code: "PERSONAL_EXPENSE", name: "Personal Expense" },
  { code: "INSURANCE", name: "Insurance" },
  { code: "OTHER", name: "Other" },
];

async function main() {
  for (const [index, item] of ITEM_TYPES.entries()) {
    const row = await prisma.serviceProductItemType.upsert({
      where: { itemTypeCode: item.code },
      create: { itemTypeCode: item.code, itemTypeName: item.name, displayOrder: index, isActive: true, createdBy: CREATED_BY },
      update: { itemTypeName: item.name, displayOrder: index, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("ServiceProductItemType", row.itemTypeCode, Number(row.serviceProductItemTypeId));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
