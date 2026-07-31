import { prisma } from "@/lib/db";

export const subscriptionModuleMenuInclude = {
  module: {
    select: {
      subscriptionModuleName: true,
      sortOrder: true,
      product: { select: { subscriptionProductName: true } },
    },
  },
  parent: { select: { menuName: true } },
  productLinks: {
    select: {
      subscriptionProductId: true,
      product: { select: { subscriptionProductName: true } },
    },
  },
} as const;

export function isAdministrationModule(module: {
  subscriptionModuleName: string;
  product?: { subscriptionProductName: string } | null;
}): boolean {
  return (
    module.subscriptionModuleName === "Administration" &&
    (module.product?.subscriptionProductName === "Administration" ||
      module.product == null)
  );
}

/** Replace product links for an Administration menu. Clears links for non-admin modules. */
export async function syncMenuProductLinks(options: {
  subscriptionModuleMenuId: number;
  subscriptionModuleId: number;
  subscriptionProductIds: number[] | undefined;
  createdBy: number;
}): Promise<void> {
  const { subscriptionModuleMenuId, subscriptionModuleId, subscriptionProductIds, createdBy } =
    options;

  const module = await prisma.subscriptionModule.findUnique({
    where: { subscriptionModuleId },
    include: { product: { select: { subscriptionProductName: true } } },
  });
  if (!module) return;

  if (!isAdministrationModule(module) || subscriptionProductIds === undefined) {
    if (!isAdministrationModule(module)) {
      await prisma.subscriptionModuleMenuProduct.deleteMany({
        where: { subscriptionModuleMenuId },
      });
    }
    return;
  }

  const adminProductId = module.subscriptionProductId;
  const uniqueIds = [
    ...new Set(
      subscriptionProductIds.filter(
        (id) => Number.isFinite(id) && id > 0 && id !== adminProductId
      )
    ),
  ];

  if (uniqueIds.length > 0) {
    const valid = await prisma.subscriptionProduct.findMany({
      where: {
        subscriptionProductId: { in: uniqueIds },
        isActive: true,
        NOT: { subscriptionProductName: "Administration" },
      },
      select: { subscriptionProductId: true },
    });
    const validIds = new Set(valid.map((p) => p.subscriptionProductId));
    const desired = uniqueIds.filter((id) => validIds.has(id));

    const existing = await prisma.subscriptionModuleMenuProduct.findMany({
      where: { subscriptionModuleMenuId },
    });
    const existingIds = new Set(existing.map((l) => l.subscriptionProductId));
    const desiredSet = new Set(desired);

    for (const link of existing) {
      if (!desiredSet.has(link.subscriptionProductId)) {
        await prisma.subscriptionModuleMenuProduct.delete({
          where: {
            subscriptionModuleMenuProductId: link.subscriptionModuleMenuProductId,
          },
        });
      }
    }

    for (const productId of desired) {
      if (existingIds.has(productId)) continue;
      await prisma.subscriptionModuleMenuProduct.create({
        data: {
          subscriptionModuleMenuId,
          subscriptionProductId: productId,
          createdBy,
        },
      });
    }
    return;
  }

  await prisma.subscriptionModuleMenuProduct.deleteMany({
    where: { subscriptionModuleMenuId },
  });
}
