import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns ok status with version and timestamp", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect(typeof body.version).toBe("string");
    expect(typeof body.timestamp).toBe("string");
  });

  it("does not expose any secret or connection detail", async () => {
    const body = await GET().json();
    const serialized = JSON.stringify(body).toLowerCase();
    for (const forbidden of [
      "database_url",
      "password",
      "api_key",
      "secret",
      "connectionstring",
      "postgres://",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
