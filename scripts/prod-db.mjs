/**
 * Load `.env.production` and run migrate/seed against Supabase (or any prod Postgres).
 *
 * Usage:
 *   node scripts/prod-db.mjs migrate
 *   node scripts/prod-db.mjs seed
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(process.cwd());
const envPath = resolve(root, ".env.production");
const action = process.argv[2];

if (!existsSync(envPath)) {
  console.error("Missing .env.production — copy from .env.production.example and fill values.");
  process.exit(1);
}

if (action !== "migrate" && action !== "seed") {
  console.error("Usage: node scripts/prod-db.mjs <migrate|seed>");
  process.exit(1);
}

function parseEnvFile(filePath) {
  const out = {};
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = parseEnvFile(envPath);
const env = { ...process.env, ...fileEnv };

// Migrations need a direct (non-pooler) connection when available.
if (action === "migrate") {
  if (fileEnv.ADMINCNX_DIRECT_URL) env.ADMINCNX_URL = fileEnv.ADMINCNX_DIRECT_URL;
  if (fileEnv.BASECNX_DIRECT_URL) env.BASECNX_URL = fileEnv.BASECNX_DIRECT_URL;
  if (fileEnv.ACCOUNTSCNX_DIRECT_URL) env.ACCOUNTSCNX_URL = fileEnv.ACCOUNTSCNX_DIRECT_URL;
  if (fileEnv.ADMINCNX_DIRECT_URL) env.DATABASE_URL = fileEnv.ADMINCNX_DIRECT_URL;
}

// Avoid Prisma loading local `.env` over production URLs.
env.PRISMA_SKIP_ENV_LOAD = "1";

async function run(args) {
  const command = args.join(" ");
  console.log(`[prod-db] ${command}`);
  return new Promise((resolvePromise) => {
    const child = spawn(command, {
      cwd: root,
      env,
      stdio: "inherit",
      shell: true,
    });
    child.on("exit", (code) => resolvePromise(code ?? 1));
  });
}

const prismaBin = `node "${resolve(root, "node_modules/prisma/build/index.js")}"`;
const tsxBin = `node "${resolve(root, "node_modules/tsx/dist/cli.mjs")}"`;

// Prefer direct DB URL for migrate AND seed (pooler/pgbouncer can hang long scripts).
if (fileEnv.ADMINCNX_DIRECT_URL) {
  env.ADMINCNX_URL = fileEnv.ADMINCNX_DIRECT_URL;
  env.DATABASE_URL = fileEnv.ADMINCNX_DIRECT_URL;
}
if (fileEnv.BASECNX_DIRECT_URL) env.BASECNX_URL = fileEnv.BASECNX_DIRECT_URL;
if (fileEnv.ACCOUNTSCNX_DIRECT_URL) env.ACCOUNTSCNX_URL = fileEnv.ACCOUNTSCNX_DIRECT_URL;

console.log(`[prod-db] Using .env.production (${action})`);
console.log(`[prod-db] ADMIN host: ${safeHost(env.ADMINCNX_URL)}`);

if (action === "migrate") {
  // Clear failed migration state from a previous partial deploy (ignore if clean).
  await run([
    prismaBin,
    "migrate resolve --rolled-back 20260731130000_subscription_module_menu_product --schema prisma/admin/schema.prisma",
  ]);

  let code = await run([
    prismaBin,
    "migrate deploy --schema prisma/admin/schema.prisma",
  ]);
  if (code !== 0) process.exit(code);

  code = await run([prismaBin, "migrate deploy --schema prisma/base/schema.prisma"]);
  if (code !== 0) process.exit(code);

  code = await run([
    prismaBin,
    "migrate deploy --schema prisma/accounts/schema.prisma",
  ]);
  process.exit(code);
}

const seedCode = await run([tsxBin, "prisma/admin/seed.ts"]);
process.exit(seedCode);

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return "(invalid url)";
  }
}