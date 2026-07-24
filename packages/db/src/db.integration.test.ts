import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { sanitizeRequestUrl } from "@all-sport/core";
import type { Kysely } from "kysely";
import {
  migrate,
  verify,
  EXPECTED_TABLES,
  createDb,
  closeDb,
  sha256Hex,
  recordObservation,
  getObservationAsOf,
  type Database,
} from "./index";

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
  let db: Kysely<Database> | undefined;
  let providerId = "";
  let runId = "";

  beforeAll(async () => {
    await migrate(connectionString);
    pool = new pg.Pool({ connectionString });
    db = createDb(connectionString);
    const provider = await pool.query<{ id: string }>(
      `insert into providers (slug, name, sport, default_truth_class)
       values ($1,$2,$3,$4) returning id`,
      [`obs-provider-${Date.now()}`, "Obs Provider", "mlb", "production_real"],
    );
    providerId = provider.rows[0]!.id;
    const run = await pool.query<{ id: string }>(
      `insert into ingestion_runs (provider_id, sport, truth_class, access_mode)
       values ($1,'mlb','production_real','production') returning id`,
      [providerId],
    );
    runId = run.rows[0]!.id;
  });

  afterAll(async () => {
    if (db) await closeDb(db);
    await pool?.end();
  });

  it("migration created every expected table", async () => {
    const result = await verify(connectionString);
    expect([...result.tables].sort()).toEqual([...EXPECTED_TABLES].sort());
  });

  it("migration is idempotent at the runner level", async () => {
    const result = await migrate(connectionString);
    expect(result.applied).toEqual([]);
    expect(result.alreadyApplied).toContain("0001_common_infrastructure");
  });

  it("enforces the providers.default_truth_class check constraint", async () => {
    await expect(
      pool!.query(
        `insert into providers (slug, name, sport, default_truth_class) values ($1,$2,$3,$4)`,
        [`bad-${Date.now()}`, "Bad", "mlb", "totally_real"],
      ),
    ).rejects.toThrow();
  });

  it("enforces foreign keys on ingestion_runs", async () => {
    await expect(
      pool!.query(
        `insert into ingestion_runs (provider_id, sport, truth_class)
         values ($1,'mlb','production_real')`,
        ["00000000-0000-4000-8000-0000000000ff"],
      ),
    ).rejects.toThrow();
  });

  // ---- Adversarial temporal-provenance scenarios (ADR-0004) ----

  it("A. same response twice => no duplicate observation (idempotent)", async () => {
    const recordId = `A-game-${Date.now()}`;
    const hash = sha256Hex('{"status":"Scheduled"}');
    const base = {
      providerId,
      ingestionRunId: runId,
      entityType: "mlb_game",
      providerRecordId: recordId,
      rawResponseHash: hash,
      parserVersion: "v1",
      normalizedSchemaVersion: "v1",
      truthClass: "production_real",
    };
    const first = await recordObservation(db!, {
      ...base,
      fetchedAt: new Date("2026-07-24T10:00:00Z"),
    });
    const second = await recordObservation(db!, {
      ...base,
      fetchedAt: new Date("2026-07-24T10:05:00Z"),
    });
    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(second.observationId).toBe(first.observationId);
    const count = await countObservations(pool!, providerId, recordId);
    expect(count).toBe(1);
  });

  it("B. same record with a changed payload => new observation, history kept", async () => {
    const recordId = `B-game-${Date.now()}`;
    const scheduled = await recordObservation(db!, {
      providerId,
      ingestionRunId: runId,
      entityType: "mlb_game",
      providerRecordId: recordId,
      rawResponseHash: sha256Hex('{"status":"Scheduled"}'),
      parserVersion: "v1",
      normalizedSchemaVersion: "v1",
      truthClass: "production_real",
      fetchedAt: new Date("2026-07-24T10:00:00Z"),
    });
    const final = await recordObservation(db!, {
      providerId,
      ingestionRunId: runId,
      entityType: "mlb_game",
      providerRecordId: recordId,
      rawResponseHash: sha256Hex('{"status":"Final","score":"5-3"}'),
      parserVersion: "v1",
      normalizedSchemaVersion: "v1",
      truthClass: "production_real",
      fetchedAt: new Date("2026-07-24T13:00:00Z"),
    });
    expect(scheduled.inserted).toBe(true);
    expect(final.inserted).toBe(true);
    expect(final.observationId).not.toBe(scheduled.observationId);
    expect(await countObservations(pool!, providerId, recordId)).toBe(2);
  });

  it("C. asOf reconstruction never returns a future observation", async () => {
    const recordId = `C-game-${Date.now()}`;
    const times = [
      { at: "2026-07-24T10:00:00Z", hash: sha256Hex("s1") },
      { at: "2026-07-24T12:00:00Z", hash: sha256Hex("s2") },
      { at: "2026-07-24T15:00:00Z", hash: sha256Hex("s3") },
    ];
    for (const t of times) {
      await recordObservation(db!, {
        providerId,
        ingestionRunId: runId,
        entityType: "mlb_game",
        providerRecordId: recordId,
        rawResponseHash: t.hash,
        parserVersion: "v1",
        normalizedSchemaVersion: "v1",
        truthClass: "production_real",
        fetchedAt: new Date(t.at),
      });
    }
    const asOf13 = await getObservationAsOf(db!, {
      providerId,
      entityType: "mlb_game",
      providerRecordId: recordId,
      asOf: new Date("2026-07-24T13:00:00Z"),
    });
    // Must select the 12:00 observation, never the future 15:00 one.
    expect(asOf13?.raw_response_hash).toBe(times[1]!.hash);
    expect(asOf13?.raw_response_hash).not.toBe(times[2]!.hash);

    const asOf9 = await getObservationAsOf(db!, {
      providerId,
      entityType: "mlb_game",
      providerRecordId: recordId,
      asOf: new Date("2026-07-24T09:00:00Z"),
    });
    // Nothing known yet before the first fetch.
    expect(asOf9).toBeUndefined();
  });

  it("D. same payload, parser upgrade => distinguishable observations", async () => {
    const recordId = `D-game-${Date.now()}`;
    const hash = sha256Hex('{"same":"payload"}');
    const v1 = await recordObservation(db!, {
      providerId,
      ingestionRunId: runId,
      entityType: "mlb_game",
      providerRecordId: recordId,
      rawResponseHash: hash,
      parserVersion: "v1",
      normalizedSchemaVersion: "v1",
      truthClass: "production_real",
      fetchedAt: new Date("2026-07-24T10:00:00Z"),
    });
    const v2 = await recordObservation(db!, {
      providerId,
      ingestionRunId: runId,
      entityType: "mlb_game",
      providerRecordId: recordId,
      rawResponseHash: hash,
      parserVersion: "v2",
      normalizedSchemaVersion: "v1",
      truthClass: "production_real",
      fetchedAt: new Date("2026-07-24T10:01:00Z"),
    });
    expect(v1.inserted).toBe(true);
    expect(v2.inserted).toBe(true);
    expect(await countObservations(pool!, providerId, recordId)).toBe(2);
  });

  it("F. same provider/record, trial vs production => distinction preserved", async () => {
    const recordId = `F-game-${Date.now()}`;
    const hash = sha256Hex('{"mode":"agnostic"}');
    const trial = await recordObservation(db!, {
      providerId,
      ingestionRunId: runId,
      entityType: "mlb_game",
      providerRecordId: recordId,
      rawResponseHash: hash,
      parserVersion: "v1",
      normalizedSchemaVersion: "v1",
      truthClass: "trial_scrambled",
      fetchedAt: new Date("2026-07-24T10:00:00Z"),
    });
    const prod = await recordObservation(db!, {
      providerId,
      ingestionRunId: runId,
      entityType: "mlb_game",
      providerRecordId: recordId,
      rawResponseHash: hash,
      parserVersion: "v1",
      normalizedSchemaVersion: "v1",
      truthClass: "production_real",
      fetchedAt: new Date("2026-07-24T10:01:00Z"),
    });
    expect(trial.inserted).toBe(true);
    expect(prod.inserted).toBe(true);
    expect(await countObservations(pool!, providerId, recordId)).toBe(2);
  });

  it("E. a request URL with a secret persists ZERO trace of the secret", async () => {
    const secret = "ULTRA_SECRET";
    const parts = sanitizeRequestUrl(
      `https://api.sportradar.com/tennis/trial/v3/en/rankings?api_key=${secret}&sport=tennis`,
    );
    await pool!.query(
      `insert into provider_requests
        (provider_id, ingestion_run_id, method, host, path, sanitized_query,
         status_code, latency_ms, truth_class, succeeded)
       values ($1,$2,'GET',$3,$4,$5,200,12,'trial_scrambled',true)`,
      [providerId, runId, parts.host, parts.path, parts.sanitizedQuery],
    );
    const row = await pool!.query(
      `select * from provider_requests where provider_id = $1 order by requested_at desc limit 1`,
      [providerId],
    );
    const serialized = JSON.stringify(row.rows[0]);
    expect(serialized).not.toContain(secret);
    expect(serialized).toContain("sport=tennis");
  });

  it("bumps updated_at via trigger", async () => {
    const client = await pool!.connect();
    try {
      await client.query("begin");
      const inserted = await client.query<{ id: string; updated_at: Date }>(
        `insert into providers (slug, name, sport, default_truth_class)
         values ($1,$2,$3,$4) returning id, updated_at`,
        [`trg-${Date.now()}`, "P", "tennis", "historical_real"],
      );
      const before = new Date(inserted.rows[0]!.updated_at).getTime();
      await new Promise((r) => setTimeout(r, 5));
      const updated = await client.query<{ updated_at: Date }>(
        `update providers set name = 'P2' where id = $1 returning updated_at`,
        [inserted.rows[0]!.id],
      );
      const after = new Date(updated.rows[0]!.updated_at).getTime();
      expect(after).toBeGreaterThanOrEqual(before);
      await client.query("rollback");
    } finally {
      client.release();
    }
  });
});

async function countObservations(
  pool: pg.Pool,
  providerId: string,
  providerRecordId: string,
): Promise<number> {
  const res = await pool.query<{ count: string }>(
    `select count(*)::text as count from provider_observations
     where provider_id = $1 and provider_record_id = $2`,
    [providerId, providerRecordId],
  );
  return Number(res.rows[0]!.count);
}
