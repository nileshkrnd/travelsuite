import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const rows = await p.property.findMany({
  select: {
    propertyCode: true,
    countryId: true,
    cityId: true,
    addressLine1: true,
    latitude: true,
    longitude: true,
  },
});
console.log(JSON.stringify(rows, null, 2));
await p.$disconnect();
