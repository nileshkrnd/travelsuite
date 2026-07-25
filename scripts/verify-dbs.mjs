import { PrismaClient as Admin } from "@prisma/client";
import { PrismaClient as Base } from "@prisma/base-client";
import { PrismaClient as Accounts } from "@prisma/accounts-client";

const admin = new Admin({ datasources: { db: { url: process.env.ADMINCNX_URL } } });
const base = new Base({ datasources: { db: { url: process.env.BASECNX_URL } } });
const accounts = new Accounts({ datasources: { db: { url: process.env.ACCOUNTSCNX_URL } } });

const redact = (url) => url?.replace(/:[^:@]+@/, ":***@");

console.log({
  admin: redact(process.env.ADMINCNX_URL),
  base: redact(process.env.BASECNX_URL),
  accounts: redact(process.env.ACCOUNTSCNX_URL),
  companies: await admin.company.count(),
  users: await admin.user.count(),
  tenants: await admin.tenant.count(),
  baseMarker: await base.baseSchemaInfo.count(),
  accountsMarker: await accounts.accountsSchemaInfo.count(),
});

await admin.$disconnect();
await base.$disconnect();
await accounts.$disconnect();
