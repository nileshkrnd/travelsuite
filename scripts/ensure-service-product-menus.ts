/**
 * Sync Administration menus: adds the "Product" group (Service Type, Service Product
 * Classification) for tenants provisioned before this feature existed. Copies Property
 * menu role permissions onto the new nodes so already-granted Access Roles see them.
 *
 * Run: npx tsx scripts/ensure-service-product-menus.ts
 */
import { PrismaClient } from "@prisma/client";
import { MODULE_MENU_SEEDS, type SeedMenuNode } from "../prisma/admin/seed-module-menus";

const prisma = new PrismaClient();
const CREATED_BY = 1;

const NEW_MENU_URLS = [
  "administration/service-product",
  "masters/service-type",
  "masters/service-product-classification",
  "masters/service-product-category",
  "masters/duration-unit",
  "masters/booking-model",
  "masters/pricing-model",
  "masters/service-type-configuration",
  "masters/service-product-classification-configuration",
  "masters/service-product",
  "masters/service-product-configuration",
  "masters/service-product-option",
  "masters/service-product-variant",
  "administration/configuration",
  "masters/common-status-type",
  "masters/common-status",
  "masters/rate-type-group",
  "masters/rate-type",
  "masters/service-product-supplier",
  "masters/service-product-availability",
  "masters/service-product-schedule",
  "masters/service-product-rate",
  "masters/service-product-location-type",
  "masters/service-product-location",
  "masters/service-product-supplier-location",
  "masters/service-product-media",
  "masters/inclusion-exclusion-type",
  "masters/service-product-item-type",
  "masters/service-product-inclusion-exclusion",
  "masters/service-product-itinerary",
] as const;
const PERM_SOURCE_URL = "masters/property";

function collectUrls(nodes: SeedMenuNode[], into: Set<string> = new Set()) {
  for (const node of nodes) {
    into.add(node.url);
    if (node.children?.length) collectUrls(node.children, into);
  }
  return into;
}

async function upsertMenuTree(
  subscriptionModuleId: number,
  nodes: SeedMenuNode[],
  parentMenuId: number | null
) {
  let sortOrder = 0;
  for (const node of nodes) {
    const row = await prisma.subscriptionModuleMenu.upsert({
      where: {
        subscriptionModuleId_menuUrl: {
          subscriptionModuleId,
          menuUrl: node.url,
        },
      },
      create: {
        subscriptionModuleId,
        parentMenuId,
        menuName: node.name,
        menuUrl: node.url,
        menuIcon: node.icon,
        sortOrder,
        isActive: true,
        createdBy: CREATED_BY,
      },
      update: {
        parentMenuId,
        menuName: node.name,
        menuIcon: node.icon,
        sortOrder,
        isActive: true,
        modifiedBy: CREATED_BY,
        modifiedDtTm: new Date(),
      },
    });
    if (node.children?.length) {
      await upsertMenuTree(subscriptionModuleId, node.children, row.subscriptionModuleMenuId);
    }
    sortOrder += 1;
  }
}

async function main() {
  const tree = MODULE_MENU_SEEDS.Administration;
  if (!tree?.length) {
    console.error("No Administration menu seed found");
    process.exit(1);
  }

  const modules = await prisma.subscriptionModule.findMany({
    where: { isActive: true, subscriptionModuleName: { in: ["Administration", "administration"] } },
    select: { subscriptionModuleId: true, subscriptionModuleName: true },
  });

  if (modules.length === 0) {
    console.error("No Administration subscription module found");
    process.exit(1);
  }

  const desiredUrls = collectUrls(tree);

  for (const mod of modules) {
    console.log("Updating menus for", mod.subscriptionModuleName, mod.subscriptionModuleId);
    await upsertMenuTree(mod.subscriptionModuleId, tree, null);

    await prisma.subscriptionModuleMenu.updateMany({
      where: {
        subscriptionModuleId: mod.subscriptionModuleId,
        menuUrl: { notIn: [...desiredUrls] },
        isActive: true,
      },
      data: {
        isActive: false,
        modifiedBy: CREATED_BY,
        modifiedDtTm: new Date(),
      },
    });

    const source = await prisma.subscriptionModuleMenu.findFirst({
      where: { subscriptionModuleId: mod.subscriptionModuleId, menuUrl: PERM_SOURCE_URL, isActive: true },
      select: { subscriptionModuleMenuId: true, menuUrl: true },
    });

    if (!source) {
      console.warn("No property menu to copy permissions from — menus upserted only");
      continue;
    }

    const sourcePerms = await prisma.tenantAccessRoleMenuPermission.findMany({
      where: { subscriptionModuleMenuId: source.subscriptionModuleMenuId, isActive: true },
    });
    console.log("Using permission source", source.menuUrl, "roles:", sourcePerms.length);

    const targetMenus = await prisma.subscriptionModuleMenu.findMany({
      where: {
        subscriptionModuleId: mod.subscriptionModuleId,
        menuUrl: { in: [...NEW_MENU_URLS] },
        isActive: true,
      },
      select: { subscriptionModuleMenuId: true, menuUrl: true },
    });

    for (const menu of targetMenus) {
      for (const p of sourcePerms) {
        await prisma.tenantAccessRoleMenuPermission.upsert({
          where: {
            tenantId_companyId_accessRoleId_subscriptionModuleMenuId: {
              tenantId: p.tenantId,
              companyId: p.companyId,
              accessRoleId: p.accessRoleId,
              subscriptionModuleMenuId: menu.subscriptionModuleMenuId,
            },
          },
          create: {
            tenantId: p.tenantId,
            companyId: p.companyId,
            accessRoleId: p.accessRoleId,
            subscriptionModuleMenuId: menu.subscriptionModuleMenuId,
            canView: p.canView,
            canCreate: p.canCreate,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
            canApprove: p.canApprove,
            canExport: p.canExport,
            canPrint: p.canPrint,
            canReadOnly: p.canReadOnly,
            isActive: true,
            createdBy: p.createdBy,
          },
          update: {
            canView: p.canView,
            canCreate: p.canCreate,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
            canApprove: p.canApprove,
            canExport: p.canExport,
            canPrint: p.canPrint,
            canReadOnly: p.canReadOnly,
            isActive: true,
            modifiedBy: CREATED_BY,
            modifiedDtTm: new Date(),
          },
        });
      }
      console.log("Granted perms for", menu.menuUrl);
    }
  }

  console.log("Administration menus synced (Product / Service Type / Service Product Classification).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
