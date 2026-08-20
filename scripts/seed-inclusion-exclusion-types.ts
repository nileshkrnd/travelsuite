/**
 * Seeds the global InclusionExclusionType lookup (Inclusion, Exclusion).
 * Run: npx tsx scripts/seed-inclusion-exclusion-types.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CREATED_BY = 1;

const TYPES: { code: string; name: string }[] = [
  { code: "INCLUSION", name: "Inclusion" },
  { code: "EXCLUSION", name: "Exclusion" },
];

async function main() {
  for (const item of TYPES) {
    const row = await prisma.inclusionExclusionType.upsert({
      where: { typeCode: item.code },
      create: { typeCode: item.code, typeName: item.name, isActive: true, createdBy: CREATED_BY },
      update: { typeName: item.name, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
    });
    console.log("InclusionExclusionType", row.typeCode, Number(row.inclusionExclusionTypeId));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
