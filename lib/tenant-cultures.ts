import type { Prisma } from "@prisma/client";
import { joinList } from "@/lib/mappers/tenant.mapper";

type Tx = Prisma.TransactionClient;

export const TENANT_CULTURE_INCLUDE = {
  tenantCultures: {
    include: {
      culture: { select: { cultureCode: true, direction: true } },
    },
    orderBy: { isDefault: "desc" as const },
  },
} as const;

/**
 * Replace tenant↔culture links and sync legacy defaultLocale / supportedLocales
 * from culture codes for backward compatibility.
 */
export async function syncTenantCultures(
  tx: Tx,
  tenantId: number,
  supportedCultureIds: number[],
  defaultCultureId: number,
  actorKey: number
): Promise<{ defaultLocale: string; supportedLocales: string }> {
  const uniqueIds = [...new Set(supportedCultureIds)];
  if (!uniqueIds.includes(defaultCultureId)) {
    uniqueIds.unshift(defaultCultureId);
  }

  const cultures = await tx.culture.findMany({
    where: { cultureId: { in: uniqueIds }, isActive: true },
    select: { cultureId: true, cultureCode: true },
  });

  if (cultures.length === 0) {
    throw new Error("Select at least one active culture");
  }
  if (!cultures.some((c) => c.cultureId === defaultCultureId)) {
    throw new Error("Default culture must be an active supported culture");
  }

  await tx.tenantCulture.deleteMany({ where: { tenantId } });
  await tx.tenantCulture.createMany({
    data: cultures.map((c) => ({
      tenantId,
      cultureId: c.cultureId,
      isDefault: c.cultureId === defaultCultureId,
      createdBy: actorKey,
    })),
  });

  const defaultCode =
    cultures.find((c) => c.cultureId === defaultCultureId)?.cultureCode ?? cultures[0]!.cultureCode;
  const codes = cultures.map((c) => c.cultureCode);
  // Keep default first in the legacy comma list.
  const ordered = [defaultCode, ...codes.filter((c) => c !== defaultCode)];

  await tx.tenant.update({
    where: { tenantId },
    data: {
      defaultLocale: defaultCode,
      supportedLocales: joinList(ordered),
    },
  });

  return { defaultLocale: defaultCode, supportedLocales: joinList(ordered) };
}
