import { describe, it, expect } from "vitest";
import { GET } from "./route";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("GET /api/health/database", () => {
  if (!hasDb) {
    it("requires DATABASE_URL to be set", () => {
      throw new Error(
        "DATABASE_URL must be set for the database health integration test",
      );
    });
    return;
  }

  it("reports the database as connected", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect(body.database).toBe("connected");
    expect(typeof body.latencyMs).toBe("number");
  });

  it("never exposes the connection string", async () => {
    const body = await (await GET()).json();
    const serialized = JSON.stringify(body).toLowerCase();
    expect(serialized).not.toContain("postgres://");
    expect(serialized).not.toContain("password");
  });
});
