import { sql } from "@vercel/postgres";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await sql.query(stmt);
  }
  console.log("Migration complete.");
}

migrate().catch(console.error);
