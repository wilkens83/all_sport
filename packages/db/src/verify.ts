import pg from "pg";
import { PlatformError } from "@all-sport/core";

/** The tables migration 0001 must create (excludes the runner's own ledger). */
export const EXPECTED_TABLES = [
  "sports",
  "providers",
  "ingestion_runs",
  "provider_requests",
  "data_quality_events",
  "source_provenance",
] as const;

export interface VerifyResult {
  ok: true;
  tables: readonly string[];
}

/**
 * Assert the expected schema exists. Throws DATABASE_ERROR listing any missing
 * tables — a checked-in SQL file is not proof; a live query is.
 */
export async function verify(connectionString: string): Promise<VerifyResult> {
  const pool = new pg.Pool({ connectionString });
  try {
    const { rows } = await pool.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const present = new Set(rows.map((r) => r.table_name));
    const missing = EXPECTED_TABLES.filter((t) => !present.has(t));
    if (missing.length > 0) {
      throw new PlatformError({
        code: "DATABASE_ERROR",
        message: `Schema verification failed; missing tables: ${missing.join(", ")}`,
        context: { missing },
      });
    }
    return { ok: true, tables: EXPECTED_TABLES };
  } finally {
    await pool.end();
  }
}
