/**
 * Add Administration → Masters → Property & Product → Additional Info Type
 * and copy permissions from Contact Type.
 *
 * Run: npx tsx scripts/ensure-property-product-menus.ts
 */
import { PrismaClient } from "@prisma/client";
import { ADMIN_MENU_PRODUCT_LINKS } from "../prisma/admin/seed-module-menus";

const prisma = new PrismaClient();
const CREATED_BY = 1;

const GROUP = {
  url: "administration/masters/property-product",
  name: "Property & Product",
  icon: "Package",
} as const;

const ITEM = {
  url: "masters/additional-info-type",
  name: "Additional Info Type",
  icon: "FileText",
} as const;

const PARENT_URL = "administration/masters";
const PERM_SOURCE_URL = "masters/contact-type";

async function upsertMenu(options: {
  subscriptionModuleId: number;
  parentMenuId: number;
  url: string;
  name: string;
  icon: string;
  sortOrder: number;
}) {
  return prisma.subscriptionModuleMenu.upsert({
    where: {
      subscriptionModuleId_menuUrl: {
        subscriptionModuleId: options.subscriptionModuleId,
        menuUrl: options.url,
      },
    },
    create: {
      subscriptionModuleId: options.subscriptionModuleId,
      parentMenuId: options.parentMenuId,
      menuName: options.name,
      menuUrl: options.url,
      menuIcon: options.icon,
      sortOrder: options.sortOrder,
      isActive: true,
      createdBy: CREATED_BY,
    },
    update: {
      parentMenuId: options.parentMenuId,
      menuName: options.name,
      menuIcon: options.icon,
      sortOrder: options.sortOrder,
      isActive: true,
      modifiedBy: CREATED_BY,
      modifiedDtTm: new Date(),
    },
  });
}

async function linkProducts(subscriptionModuleMenuId: number, menuUrl: string) {
  const productNames = ADMIN_MENU_PRODUCT_LINKS[menuUrl] ?? [];
  if (productNames.length === 0) return;
  const products = await prisma.subscriptionProduct.findMany({
    where: { isActive: true, subscriptionProductName: { in: productNames } },
    select: { subscriptionProductId: true, subscriptionProductName: true },
  });
  for (const product of products) {
    await prisma.subscriptionModuleMenuProduct.upsert({
      where: {
        subscriptionModuleMenuId_subscriptionProductId: {
          subscriptionModuleMenuId,
          subscriptionProductId: product.subscriptionProductId,
        },
      },
      create: {
        subscriptionModuleMenuId,
        subscriptionProductId: product.subscriptionProductId,
        createdBy: CREATED_BY,
      },
      update: {},
    });
  }
  console.log("Linked products for", menuUrl, products.map((p) => p.subscriptionProductName).join(", "));
}

async function copyPermissions(sourceMenuId: number, targetMenuId: number, menuUrl: string) {
  const sourcePerms = await prisma.tenantAccessRoleMenuPermission.findMany({
    where: { subscriptionModuleMenuId: sourceMenuId, isActive: true },
  });
  for (const p of sourcePerms) {
    await prisma.tenantAccessRoleMenuPermission.upsert({
      where: {
        tenantId_companyId_accessRoleId_subscriptionModuleMenuId: {
          tenantId: p.tenantId,
          companyId: p.companyId,
          accessRoleId: p.accessRoleId,
          subscriptionModuleMenuId: targetMenuId,
        },
      },
      create: {
        tenantId: p.tenantId,
        companyId: p.companyId,
        accessRoleId: p.accessRoleId,
        subscriptionModuleMenuId: targetMenuId,
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
  console.log("Granted perms for", menuUrl, "roles:", sourcePerms.length);
}

async function main() {
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

    const masters = await prisma.subscriptionModuleMenu.findFirst({
      where: { subscriptionModuleId: mod.subscriptionModuleId, menuUrl: PARENT_URL, isActive: true },
    });
    if (!masters) {
      console.warn("Masters menu not found — skip");
      continue;
    }

    const group = await upsertMenu({
      subscriptionModuleId: mod.subscriptionModuleId,
      parentMenuId: masters.subscriptionModuleMenuId,
      url: GROUP.url,
      name: GROUP.name,
      icon: GROUP.icon,
      sortOrder: 1,
    });
    const item = await upsertMenu({
      subscriptionModuleId: mod.subscriptionModuleId,
      parentMenuId: group.subscriptionModuleMenuId,
      url: ITEM.url,
      name: ITEM.name,
      icon: ITEM.icon,
      sortOrder: 0,
    });

    const mastersChildOrder = [
      "administration/masters/general",
      GROUP.url,
      "masters/department",
      "masters/designation",
      "masters/access-role",
      "administration/permissions",
    ];
    for (let i = 0; i < mastersChildOrder.length; i++) {
      await prisma.subscriptionModuleMenu.updateMany({
        where: { subscriptionModuleId: mod.subscriptionModuleId, menuUrl: mastersChildOrder[i] },
        data: { sortOrder: i, modifiedBy: CREATED_BY, modifiedDtTm: new Date() },
      });
    }

    await linkProducts(group.subscriptionModuleMenuId, GROUP.url);
    await linkProducts(item.subscriptionModuleMenuId, ITEM.url);

    const source = await prisma.subscriptionModuleMenu.findFirst({
      where: { subscriptionModuleId: mod.subscriptionModuleId, menuUrl: PERM_SOURCE_URL, isActive: true },
    });
    if (!source) {
      console.warn("No Contact Type menu to copy permissions from");
      continue;
    }
    await copyPermissions(source.subscriptionModuleMenuId, group.subscriptionModuleMenuId, GROUP.url);
    await copyPermissions(source.subscriptionModuleMenuId, item.subscriptionModuleMenuId, ITEM.url);
  }

  console.log("Property & Product menus synced.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
