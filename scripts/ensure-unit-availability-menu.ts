/**
 * Upsert Unit Availability under Property Management and copy view perms from Floors.
 *
 * Run: npx tsx scripts/ensure-unit-availability-menu.ts
 */
import { PrismaClient } from "@prisma/client";
import { MODULE_MENU_SEEDS, type SeedMenuNode } from "../prisma/admin/seed-module-menus";

const prisma = new PrismaClient();
const CREATED_BY = 1;

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
  const tree = MODULE_MENU_SEEDS["Property Management"];
  if (!tree?.length) {
    console.error("No Property Management menu seed found");
    process.exit(1);
  }

  const modules = await prisma.subscriptionModule.findMany({
    where: { isActive: true, subscriptionModuleName: "Property Management" },
    select: { subscriptionModuleId: true, subscriptionModuleName: true },
  });

  if (modules.length === 0) {
    console.error("No Property Management subscription module found");
    process.exit(1);
  }

  for (const mod of modules) {
    console.log("Updating menus for", mod.subscriptionModuleName, mod.subscriptionModuleId);
    await upsertMenuTree(mod.subscriptionModuleId, tree, null);

    const floors = await prisma.subscriptionModuleMenu.findFirst({
      where: { subscriptionModuleId: mod.subscriptionModuleId, menuUrl: "masters/property-floor" },
    });
    const availability = await prisma.subscriptionModuleMenu.findFirst({
      where: { subscriptionModuleId: mod.subscriptionModuleId, menuUrl: "property/unit-availability" },
    });

    if (!floors || !availability) {
      console.warn("Missing floors or availability menu after upsert");
      continue;
    }

    const sourcePerms = await prisma.tenantAccessRoleMenuPermission.findMany({
      where: { subscriptionModuleMenuId: floors.subscriptionModuleMenuId, isActive: true },
    });
    console.log("Copying", sourcePerms.length, "role permissions from Floors");

    for (const p of sourcePerms) {
      await prisma.tenantAccessRoleMenuPermission.upsert({
        where: {
          tenantId_companyId_accessRoleId_subscriptionModuleMenuId: {
            tenantId: p.tenantId,
            companyId: p.companyId,
            accessRoleId: p.accessRoleId,
            subscriptionModuleMenuId: availability.subscriptionModuleMenuId,
          },
        },
        create: {
          tenantId: p.tenantId,
          companyId: p.companyId,
          accessRoleId: p.accessRoleId,
          subscriptionModuleMenuId: availability.subscriptionModuleMenuId,
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

    console.log("Upserted", availability.menuUrl, availability.subscriptionModuleMenuId);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
