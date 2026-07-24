import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import { PlatformError } from "@all-sport/core";
import type { Database } from "./schema";

export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString });
}

/** Create a typed Kysely instance over a PostgreSQL connection. */
export function createDb(connectionString: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: createPool(connectionString) }),
  });
}

export async function closeDb(db: Kysely<Database>): Promise<void> {
  await db.destroy();
}

export interface DatabasePing {
  connected: boolean;
  latencyMs: number | null;
}

/**
 * Liveness probe used by the health endpoint. Runs `select 1` and reports
 * connectivity + latency. Never throws — a failed probe reports connected:false.
 * (No credentials or connection details are ever included in the result.)
 */
export async function pingDatabase(
  db: Kysely<Database>,
): Promise<DatabasePing> {
  const start = Date.now();
  try {
    await sql`select 1`.execute(db);
    return { connected: true, latencyMs: Date.now() - start };
  } catch {
    return { connected: false, latencyMs: null };
  }
}

/** Wrap an unknown DB failure in a stable PlatformError. */
export function toDatabaseError(
  cause: unknown,
  message: string,
): PlatformError {
  return new PlatformError({ code: "DATABASE_ERROR", message, cause });
}
