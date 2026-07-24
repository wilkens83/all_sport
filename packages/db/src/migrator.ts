import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import { PlatformError } from "@all-sport/core";

/**
 * Default location of the SQL migration files, resolved relative to this module
 * (packages/db/src → repo root → database/migrations). Overridable for tests.
 *
 * Built with path.resolve (not `new URL(..., import.meta.url)`) so bundlers that
 * treat the latter as a static asset import don't try to resolve the directory at
 * build time — this path is only ever read at runtime by the migration CLI.
 */
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_MIGRATIONS_DIR = path.resolve(
  moduleDir,
  "..",
  "..",
  "..",
  "database",
  "migrations",
);

export interface MigrateResult {
  applied: string[];
  alreadyApplied: string[];
}

/**
 * Apply all pending SQL migrations in filename order, each in its own
 * transaction, recording applied versions in `schema_migrations`. Idempotent at
 * the runner level: re-running applies nothing and returns the versions under
 * `alreadyApplied`.
 */
export async function migrate(
  connectionString: string,
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR,
): Promise<MigrateResult> {
  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query(
      `create table if not exists schema_migrations (
         version text primary key,
         applied_at timestamptz not null default now()
       )`,
    );

    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const existing = await client.query<{ version: string }>(
      `select version from schema_migrations`,
    );
    const done = new Set(existing.rows.map((r) => r.version));

    const applied: string[] = [];
    const alreadyApplied: string[] = [];

    for (const file of files) {
      const version = file.replace(/\.sql$/, "");
      if (done.has(version)) {
        alreadyApplied.push(version);
        continue;
      }
      const sqlText = await readFile(path.join(migrationsDir, file), "utf8");
      try {
        await client.query("begin");
        await client.query(sqlText);
        await client.query(
          "insert into schema_migrations (version) values ($1)",
          [version],
        );
        await client.query("commit");
        applied.push(version);
      } catch (cause) {
        await client.query("rollback");
        throw new PlatformError({
          code: "DATABASE_ERROR",
          message: `Migration ${version} failed`,
          cause,
          context: { file },
        });
      }
    }

    return { applied, alreadyApplied };
  } finally {
    client.release();
    await pool.end();
  }
}
