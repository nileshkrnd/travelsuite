/**
 * Multi-database clients:
 * - adminDb / prisma  → KlyraAdmin (masters & configuration)
 * - getBaseDb()       → KlyraBase (booking / operations)
 * - getAccountsDb()   → KlyraAccounts (finance)
 */
import { PrismaClient as AdminPrismaClient } from "@prisma/client";
import { PrismaClient as BasePrismaClient } from "@prisma/base-client";
import { PrismaClient as AccountsPrismaClient } from "@prisma/accounts-client";

const globalForDb = globalThis as unknown as {
  adminDb?: AdminPrismaClient;
  baseDb?: BasePrismaClient;
  accountsDb?: AccountsPrismaClient;
};

const log = process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const);

function requireUrl(primary: string | undefined, fallback: string | undefined, label: string): string {
  const url = primary?.trim() || fallback?.trim();
  if (!url) {
    throw new Error(
      `Missing ${label}. Set ADMINCNX_URL / BASECNX_URL / ACCOUNTSCNX_URL in .env (see .env.example), then restart next.`
    );
  }
  return url;
}

/** Masters & configuration (ADMINCNX_URL → KlyraAdmin). */
export function getAdminDb(): AdminPrismaClient {
  if (!globalForDb.adminDb) {
    const url = requireUrl(process.env.ADMINCNX_URL, process.env.DATABASE_URL, "ADMINCNX_URL");
    globalForDb.adminDb = new AdminPrismaClient({
      datasources: { db: { url } },
      log: [...log],
    });
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

/** Admin client used by all master / auth APIs. */
export const adminDb = getAdminDb();

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
