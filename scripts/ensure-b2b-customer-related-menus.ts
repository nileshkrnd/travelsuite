/**
 * Upsert B2B customer lookup menus under Administration → Customers and copy
 * permissions from the existing B2B Customer item.
 *
 * Run: npx tsx scripts/ensure-b2b-customer-related-menus.ts
 */
import { PrismaClient } from "@prisma/client";
import { MODULE_MENU_SEEDS, type SeedMenuNode } from "../prisma/admin/seed-module-menus";

const prisma = new PrismaClient();
const CREATED_BY = 1;

const NEW_MENU_URLS = [
  "masters/b2b-customer-contact-type",
  "masters/address-type",
  "masters/b2b-customer-document-type",
  "masters/b2b-customer-credit-status",
] as const;
const PERM_SOURCE_URL = "masters/b2bCustomer";

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

  for (const mod of modules) {
    console.log("Updating menus for", mod.subscriptionModuleName, mod.subscriptionModuleId);
    await upsertMenuTree(mod.subscriptionModuleId, tree, null);

    const source = await prisma.subscriptionModuleMenu.findFirst({
      where: { subscriptionModuleId: mod.subscriptionModuleId, menuUrl: PERM_SOURCE_URL, isActive: true },
      select: { subscriptionModuleMenuId: true, menuUrl: true },
    });

    if (!source) {
      console.warn("No B2B Customer menu to copy permissions from — menus upserted only");
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

  console.log("B2B customer lookup menus synced.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
