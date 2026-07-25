import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Matches seeded mock tenantKey / companyKey / userKey for Regency + leisure company. */
const TENANT_KEY = 1;
const COMPANY_KEY = 1;
const CREATED_BY = 2; // Alex Tenant Admin

async function main() {
  const count = await prisma.region.count({
    where: { tenantId: TENANT_KEY, companyId: COMPANY_KEY },
  });
  if (count > 0) return;

  await prisma.region.createMany({
    data: [
      {
        tenantId: TENANT_KEY,
        companyId: COMPANY_KEY,
        regionCode: "GCC",
        regionName: "Gulf Cooperation Council",
        createdBy: CREATED_BY,
      },
      {
        tenantId: TENANT_KEY,
        companyId: COMPANY_KEY,
        regionCode: "EU",
        regionName: "Europe",
        createdBy: CREATED_BY,
      },
      {
        tenantId: TENANT_KEY,
        companyId: COMPANY_KEY,
        regionCode: "APAC",
        regionName: "Asia Pacific",
        createdBy: CREATED_BY,
      },
    ],
  });
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
