import pg from "pg";

const { Client } = pg;

const names = ["KlyraAdmin", "KlyraBase", "KlyraAccounts", "KlyraHelpDesk"];

const client = new Client({
  connectionString: "postgres://postgres:dev2026@127.0.0.1:5432/postgres",
});

await client.connect();
for (const name of names) {
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (exists.rowCount) {
    console.log("exists", name);
    continue;
  }
  await client.query(`CREATE DATABASE "${name}"`);
  console.log("created", name);
}
await client.end();
