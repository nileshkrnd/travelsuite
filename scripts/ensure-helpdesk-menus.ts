/**
 * Upsert the full Helpdesk subscription module menu tree and grant view perms
 * to roles that already have Helpdesk tickets access.
 *
 * Run: npx tsx scripts/ensure-helpdesk-menus.ts
 */
import { PrismaClient } from "@prisma/client";
import { MODULE_MENU_SEEDS, type SeedMenuNode } from "../prisma/admin/seed-module-menus";

const prisma = new PrismaClient();
const CREATED_BY = 1;

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
  const tree = MODULE_MENU_SEEDS.Helpdesk;
  if (!tree?.length) {
    console.error("No Helpdesk menu seed found");
    process.exit(1);
  }

  const helpdeskModules = await prisma.subscriptionModule.findMany({
    where: { isActive: true, subscriptionModuleName: { in: ["Helpdesk", "helpdesk"] } },
    select: { subscriptionModuleId: true, subscriptionModuleName: true },
  });

  if (helpdeskModules.length === 0) {
    console.error("No Helpdesk subscription module found");
    process.exit(1);
  }

  const desiredUrls = collectUrls(tree);

  for (const mod of helpdeskModules) {
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

    const candidates = await prisma.subscriptionModuleMenu.findMany({
      where: {
        subscriptionModuleId: mod.subscriptionModuleId,
        menuUrl: { in: ["helpdesk/tickets", "helpdesk/dashboard", "helpdesk/mailboxes"] },
      },
      select: { subscriptionModuleMenuId: true, menuUrl: true },
    });

    let sourceId: number | null = null;
    for (const c of candidates) {
      const count = await prisma.tenantAccessRoleMenuPermission.count({
        where: { subscriptionModuleMenuId: c.subscriptionModuleMenuId, isActive: true },
      });
      if (count > 0) {
        sourceId = c.subscriptionModuleMenuId;
        console.log("Using permission source", c.menuUrl, count);
        break;
      }
    }

    if (!sourceId) {
      console.warn("No source menu with permissions to copy from");
      continue;
    }

    const sourcePerms = await prisma.tenantAccessRoleMenuPermission.findMany({
      where: { subscriptionModuleMenuId: sourceId, isActive: true },
    });

    const menus = await prisma.subscriptionModuleMenu.findMany({
      where: { subscriptionModuleId: mod.subscriptionModuleId, isActive: true },
      select: { subscriptionModuleMenuId: true, menuUrl: true },
    });

    console.log("Copying", sourcePerms.length, "role perms onto", menus.length, "menus");

    for (const menu of menus) {
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
    }
  }

  console.log("Helpdesk menus synced.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
