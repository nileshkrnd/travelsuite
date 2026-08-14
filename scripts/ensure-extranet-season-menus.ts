/**
 * Sync Extranet menus: Property Season, Property Room; remove Contract Season Periods from sidebar.
 * Copies Contracts role permissions onto new room menus.
 *
 * Run: npx tsx scripts/ensure-extranet-season-menus.ts
 */
import { PrismaClient } from "@prisma/client";
import { MODULE_MENU_SEEDS, type SeedMenuNode } from "../prisma/admin/seed-module-menus";

const prisma = new PrismaClient();
const CREATED_BY = 1;

const NEW_MENU_URLS = ["extranet/rooms"] as const;
const PERM_SOURCE_URL = "extranet/contracts";
const RETIRED_URLS = ["extranet/contract-season-periods"] as const;

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
  const tree = MODULE_MENU_SEEDS.Extranet;
  if (!tree?.length) {
    console.error("No Extranet menu seed found");
    process.exit(1);
  }

  const modules = await prisma.subscriptionModule.findMany({
    where: { isActive: true, subscriptionModuleName: { in: ["Extranet", "extranet"] } },
    select: { subscriptionModuleId: true, subscriptionModuleName: true },
  });

  if (modules.length === 0) {
    console.error("No Extranet subscription module found");
    process.exit(1);
  }

  const desiredUrls = collectUrls(tree);

  for (const mod of modules) {
    console.log("Updating menus for", mod.subscriptionModuleName, mod.subscriptionModuleId);
    await upsertMenuTree(mod.subscriptionModuleId, tree, null);

    await prisma.subscriptionModuleMenu.updateMany({
      where: {
        subscriptionModuleId: mod.subscriptionModuleId,
        OR: [{ menuUrl: { notIn: [...desiredUrls] } }, { menuUrl: { in: [...RETIRED_URLS] } }],
        isActive: true,
      },
      data: {
        isActive: false,
        modifiedBy: CREATED_BY,
        modifiedDtTm: new Date(),
      },
    });

    // Rename seasons menu label if present
    await prisma.subscriptionModuleMenu.updateMany({
      where: { subscriptionModuleId: mod.subscriptionModuleId, menuUrl: "extranet/seasons" },
      data: {
        menuName: "Property Season",
        menuIcon: "CalendarRange",
        isActive: true,
        modifiedBy: CREATED_BY,
        modifiedDtTm: new Date(),
      },
    });

    const source = await prisma.subscriptionModuleMenu.findFirst({
      where: {
        subscriptionModuleId: mod.subscriptionModuleId,
        menuUrl: PERM_SOURCE_URL,
        isActive: true,
      },
      select: { subscriptionModuleMenuId: true, menuUrl: true },
    });

    if (!source) {
      console.warn("No contracts menu to copy permissions from — menus upserted only");
      continue;
    }

    const sourcePerms = await prisma.tenantAccessRoleMenuPermission.findMany({
      where: { subscriptionModuleMenuId: source.subscriptionModuleMenuId, isActive: true },
    });
    console.log("Using permission source", source.menuUrl, "roles:", sourcePerms.length);

    const targetMenus = await prisma.subscriptionModuleMenu.findMany({
      where: {
        subscriptionModuleId: mod.subscriptionModuleId,
        menuUrl: { in: ["extranet/seasons", ...NEW_MENU_URLS] },
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

  console.log("Extranet menus synced (Property Season / Property Room).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
