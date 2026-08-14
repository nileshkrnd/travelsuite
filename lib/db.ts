/**
 * Multi-database clients:
 * - adminDb / prisma     → KlyraAdmin (masters & configuration)
 * - getBaseDb()          → KlyraBase (booking / operations)
 * - getAccountsDb()      → KlyraAccounts (finance)
 * - getHelpdeskDb()      → KlyraHelpdesk (support tickets / mailbox sync)
 */
import fs from "fs";
import path from "path";
import { PrismaClient as AdminPrismaClient } from "@prisma/client";
import { PrismaClient as BasePrismaClient } from "@prisma/base-client";
import { PrismaClient as AccountsPrismaClient } from "@prisma/accounts-client";
import { PrismaClient as HelpdeskPrismaClient } from "@prisma/helpdesk-client";

const globalForDb = globalThis as unknown as {
  adminDb?: AdminPrismaClient;
  adminDbModelCount?: number;
  baseDb?: BasePrismaClient;
  accountsDb?: AccountsPrismaClient;
  helpdeskDb?: HelpdeskPrismaClient;
};

const ADMIN_SCHEMA_PATH = path.join(process.cwd(), "prisma/admin/schema.prisma");

/** After `prisma generate`, a hot-reloaded Next dev server may still hold an old Prisma singleton. */
function countAdminSchemaModels(): number | undefined {
  try {
    const text = fs.readFileSync(ADMIN_SCHEMA_PATH, "utf8");
    return (text.match(/^model /gm) ?? []).length;
  } catch {
    return undefined;
  }
}

function adminClientModelCount(client: AdminPrismaClient): number {
  return Object.keys(client._runtimeDataModel?.models ?? {}).length;
}

function adminClientIsStale(client: AdminPrismaClient): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const expectedModels = countAdminSchemaModels();
  const cachedModels = adminClientModelCount(client);
  if (expectedModels != null && cachedModels !== expectedModels) return true;
  // New delegates missing when the module loaded before `prisma generate`.
  return (
    !("dayOfWeek" in client) ||
    !("propertyContractRateDay" in client) ||
    !("propertyRoomAvailability" in client) ||
    !("inventoryType" in client) ||
    !("propertyContractInventory" in client) ||
    !("supplementType" in client) ||
    !("propertyContractSupplement" in client) ||
    !("childPolicyType" in client) ||
    !("propertyContractChildPolicy" in client) ||
    !("cancellationPolicyType" in client) ||
    !("propertyContractCancellationPolicy" in client) ||
    !("promotionType" in client) ||
    !("promotionBenefitType" in client) ||
    !("propertyContractPromotion" in client) ||
    !("stopSaleType" in client) ||
    !("stopSaleReason" in client) ||
    !("propertyContractStopSale" in client) ||
    !("blackoutType" in client) ||
    !("blackoutReason" in client) ||
    !("propertyContractBlackout" in client)
  );
}

function refreshAdminDbIfStale(): void {
  if (process.env.NODE_ENV === "production") return;
  const cached = globalForDb.adminDb;
  if (!cached || !adminClientIsStale(cached)) {
    if (cached) globalForDb.adminDbModelCount = adminClientModelCount(cached);
    return;
  }

  void cached.$disconnect();
  globalForDb.adminDb = undefined;
  globalForDb.adminDbModelCount = undefined;
}

const log = process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const);

function requireUrl(primary: string | undefined, fallback: string | undefined, label: string): string {
  const url = primary?.trim() || fallback?.trim();
  if (!url) {
    throw new Error(
      `Missing ${label}. Set ADMINCNX_URL / BASECNX_URL / ACCOUNTSCNX_URL / HELPDESKCNX_URL in .env (see .env.example), then restart next.`
    );
  }
  return url;
}

/** Masters & configuration (ADMINCNX_URL → KlyraAdmin). */
export function getAdminDb(): AdminPrismaClient {
  refreshAdminDbIfStale();

  if (!globalForDb.adminDb) {
    const url = requireUrl(process.env.ADMINCNX_URL, process.env.DATABASE_URL, "ADMINCNX_URL");
    globalForDb.adminDb = new AdminPrismaClient({
      datasources: { db: { url } },
      log: [...log],
    });
    globalForDb.adminDbModelCount = adminClientModelCount(globalForDb.adminDb);
  }
  return globalForDb.adminDb;
}

/** Booking / operations (BASECNX_URL → KlyraBase). */
export function getBaseDb(): BasePrismaClient {
  if (!globalForDb.baseDb) {
    const url = requireUrl(process.env.BASECNX_URL, undefined, "BASECNX_URL");
    globalForDb.baseDb = new BasePrismaClient({
      datasources: { db: { url } },
      log: [...log],
    });
  }
  return globalForDb.baseDb;
}

/** Finance / accounting (ACCOUNTSCNX_URL → KlyraAccounts). */
export function getAccountsDb(): AccountsPrismaClient {
  if (!globalForDb.accountsDb) {
    const url = requireUrl(process.env.ACCOUNTSCNX_URL, undefined, "ACCOUNTSCNX_URL");
    globalForDb.accountsDb = new AccountsPrismaClient({
      datasources: { db: { url } },
      log: [...log],
    });
  }
  return globalForDb.accountsDb;
}

/** Helpdesk tickets & mailbox sync (HELPDESKCNX_URL → KlyraHelpdesk). */
export function getHelpdeskDb(): HelpdeskPrismaClient {
  if (!globalForDb.helpdeskDb) {
    const url = requireUrl(process.env.HELPDESKCNX_URL, undefined, "HELPDESKCNX_URL");
    globalForDb.helpdeskDb = new HelpdeskPrismaClient({
      datasources: { db: { url } },
      log: [...log],
    });
  }
  return globalForDb.helpdeskDb;
}

function adminDbProxy(): AdminPrismaClient {
  return new Proxy({} as AdminPrismaClient, {
    get(_t, prop, receiver) {
      const client = getAdminDb();
      const value = Reflect.get(client as object, prop, receiver);
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
    },
  });
}

/** Admin client used by all master / auth APIs. */
export const adminDb = adminDbProxy();

/** Alias kept for existing imports. */
export const prisma = adminDb;

/** Lazy aliases for future booking/finance modules. */
export const baseDb = new Proxy({} as BasePrismaClient, {
  get(_t, prop, receiver) {
    const client = getBaseDb();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});

export const accountsDb = new Proxy({} as AccountsPrismaClient, {
  get(_t, prop, receiver) {
    const client = getAccountsDb();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});

export const helpdeskDb = new Proxy({} as HelpdeskPrismaClient, {
  get(_t, prop, receiver) {
    const client = getHelpdeskDb();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});
