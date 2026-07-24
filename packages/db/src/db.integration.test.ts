import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { migrate, verify, EXPECTED_TABLES } from "./index";

const url = process.env.DATABASE_URL;

describe("database integration", () => {
  if (!url) {
    // Fail loudly rather than skip — a skipped integration test must never be
    // mistaken for a passing one.
    it("requires DATABASE_URL to be set", () => {
      throw new Error(
        "DATABASE_URL must be set for the database integration tests",
      );
    });
    return;
  }
  const connectionString = url;
  let pool: pg.Pool | undefined;

  beforeAll(async () => {
    // Migrate from whatever state the database is in (fresh in CI).
    await migrate(connectionString);
    pool = new pg.Pool({ connectionString });
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("migration created every expected table", async () => {
    const result = await verify(connectionString);
    expect(result.ok).toBe(true);
    expect([...result.tables].sort()).toEqual([...EXPECTED_TABLES].sort());
  });

  it("migration is idempotent at the runner level", async () => {
    const result = await migrate(connectionString);
    expect(result.applied).toEqual([]);
    expect(result.alreadyApplied).toContain("0001_common_infrastructure");
  });

  it("enforces the providers.truth_class check constraint", async () => {
    await expect(
      pool!.query(
        `insert into providers (slug, name, sport, truth_class) values ($1,$2,$3,$4)`,
        [`bad-${Date.now()}`, "Bad", "mlb", "totally_real"],
      ),
    ).rejects.toThrow();
  });

  it("enforces foreign keys on ingestion_runs", async () => {
    const nonexistentProvider = "00000000-0000-4000-8000-0000000000ff";
    await expect(
      pool!.query(
        `insert into ingestion_runs (provider_id, sport) values ($1,$2)`,
        [nonexistentProvider, "mlb"],
      ),
    ).rejects.toThrow();
  });

  it("enforces source_provenance uniqueness (idempotent ingestion key)", async () => {
    const client = await pool!.connect();
    try {
      await client.query("begin");
      const provider = await client.query<{ id: string }>(
        `insert into providers (slug, name, sport, truth_class)
         values ($1,$2,$3,$4) returning id`,
        [`mlb-stats-${Date.now()}`, "MLB Stats", "mlb", "production_real"],
      );
      const providerId = provider.rows[0]!.id;
      const run = await client.query<{ id: string }>(
        `insert into ingestion_runs (provider_id, sport) values ($1,$2) returning id`,
        [providerId, "mlb"],
      );
      const runId = run.rows[0]!.id;
      const entityId = "11111111-1111-4111-8111-111111111111";
      const insertProvenance = () =>
        client.query(
          `insert into source_provenance
             (provider_id, ingestion_run_id, entity_type, entity_id,
              provider_record_id, fetched_at, parser_version, raw_response_hash,
              normalized_schema_version, truth_class)
           values ($1,$2,'mlb_game',$3,'game-777', now(), 'v1', 'deadbeef', 'v1', 'production_real')`,
          [providerId, runId, entityId],
        );

      await insertProvenance();
      await expect(insertProvenance()).rejects.toThrow();
      await client.query("rollback");
    } finally {
      client.release();
    }
  });

  it("accepts a valid FK graph and bumps updated_at via trigger", async () => {
    const client = await pool!.connect();
    try {
      await client.query("begin");
      const inserted = await client.query<{ id: string; updated_at: Date }>(
        `insert into providers (slug, name, sport, truth_class)
         values ($1,$2,$3,$4) returning id, updated_at`,
        [`prov-${Date.now()}`, "P", "tennis", "historical_real"],
      );
      const providerId = inserted.rows[0]!.id;
      const before = new Date(inserted.rows[0]!.updated_at).getTime();
      await new Promise((r) => setTimeout(r, 5));
      const updated = await client.query<{ updated_at: Date }>(
        `update providers set name = 'P2' where id = $1 returning updated_at`,
        [providerId],
      );
      const after = new Date(updated.rows[0]!.updated_at).getTime();
      expect(after).toBeGreaterThanOrEqual(before);
      await client.query("rollback");
    } finally {
      client.release();
    }
  });
});
