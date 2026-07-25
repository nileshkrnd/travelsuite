import fs from "node:fs";

const path = ".env";
if (!fs.existsSync(path)) {
  console.log("No .env file");
  process.exit(0);
}

const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);
const seen = new Set();
const out = [];

const preferred = {
  ADMINCNX_URL: 'ADMINCNX_URL="postgres://postgres:dev2026@127.0.0.1:5432/KlyraAdmin?schema=public"',
  BASECNX_URL: 'BASECNX_URL="postgres://postgres:dev2026@127.0.0.1:5432/KlyraBase?schema=public"',
  ACCOUNTSCNX_URL:
    'ACCOUNTSCNX_URL="postgres://postgres:dev2026@127.0.0.1:5432/KlyraAccounts?schema=public"',
  DATABASE_URL: 'DATABASE_URL="postgres://postgres:dev2026@127.0.0.1:5432/KlyraAdmin?schema=public"',
};

for (const line of lines) {
  const key = line.match(/^(ADMINCNX_URL|BASECNX_URL|ACCOUNTSCNX_URL|DATABASE_URL)=/)?.[1];
  if (!key) {
    out.push(line);
    continue;
  }
  if (seen.has(key)) continue;
  seen.add(key);
  out.push(preferred[key] ?? line);
}

for (const [key, value] of Object.entries(preferred)) {
  if (!seen.has(key)) out.push(value);
}

fs.writeFileSync(path, `${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`);
console.log("Normalized DB URLs in .env");
