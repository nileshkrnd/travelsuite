import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const helpdeskModules = await prisma.subscriptionModule.findMany({
    where: { isActive: true, subscriptionModuleName: { in: ["Helpdesk", "helpdesk"] } },
    select: { subscriptionModuleId: true, subscriptionModuleName: true },
  });

  console.log("modules", helpdeskModules);

  if (helpdeskModules.length === 0) {
    const all = await prisma.subscriptionModule.findMany({
      where: { subscriptionModuleName: { contains: "Help", mode: "insensitive" } },
      select: { subscriptionModuleId: true, subscriptionModuleName: true },
    });
    console.log("help-like modules", all);
    return;
  }

  for (const mod of helpdeskModules) {
    const parent = await prisma.subscriptionModuleMenu.findFirst({
      where: {
        subscriptionModuleId: mod.subscriptionModuleId,
        menuUrl: "helpdesk",
        isActive: true,
      },
    });
    const tickets = await prisma.subscriptionModuleMenu.findFirst({
      where: {
        subscriptionModuleId: mod.subscriptionModuleId,
        menuUrl: "helpdesk/tickets",
      },
    });

    console.log(
      "parent",
      parent?.subscriptionModuleMenuId,
      "tickets",
      tickets?.subscriptionModuleMenuId,
      tickets?.sortOrder
    );

    const sortOrder = (tickets?.sortOrder ?? 1) + 1;
    const row = await prisma.subscriptionModuleMenu.upsert({
      where: {
        subscriptionModuleId_menuUrl: {
          subscriptionModuleId: mod.subscriptionModuleId,
          menuUrl: "helpdesk/mailboxes",
        },
      },
      create: {
        subscriptionModuleId: mod.subscriptionModuleId,
        parentMenuId: parent?.subscriptionModuleMenuId ?? tickets?.parentMenuId ?? null,
        menuName: "Support Mailboxes",
        menuUrl: "helpdesk/mailboxes",
        menuIcon: "Inbox",
        sortOrder,
        isActive: true,
        createdBy: 1,
      },
      update: {
        parentMenuId: parent?.subscriptionModuleMenuId ?? tickets?.parentMenuId ?? null,
        menuName: "Support Mailboxes",
        menuIcon: "Inbox",
        sortOrder,
        isActive: true,
        modifiedBy: 1,
        modifiedDtTm: new Date(),
      },
    });

    console.log("upserted mailbox menu", row.subscriptionModuleMenuId);

    if (!tickets) continue;

    const ticketPerms = await prisma.tenantAccessRoleMenuPermission.findMany({
      where: {
        subscriptionModuleMenuId: tickets.subscriptionModuleMenuId,
        isActive: true,
      },
    });

    console.log("copying", ticketPerms.length, "role permissions from tickets");

    for (const p of ticketPerms) {
      await prisma.tenantAccessRoleMenuPermission.upsert({
        where: {
          tenantId_companyId_accessRoleId_subscriptionModuleMenuId: {
            tenantId: p.tenantId,
            companyId: p.companyId,
            accessRoleId: p.accessRoleId,
            subscriptionModuleMenuId: row.subscriptionModuleMenuId,
          },
        },
        create: {
          tenantId: p.tenantId,
          companyId: p.companyId,
          accessRoleId: p.accessRoleId,
          subscriptionModuleMenuId: row.subscriptionModuleMenuId,
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
          modifiedBy: 1,
          modifiedDtTm: new Date(),
        },
      });
    }
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
