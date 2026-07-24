import { describe, it, expect } from "vitest";
import { PlatformError } from "@all-sport/core";
import { requireDatabaseUrl } from "./config";

describe("requireDatabaseUrl", () => {
  it("returns the URL when set", () => {
    expect(requireDatabaseUrl({ DATABASE_URL: "postgres://x" })).toBe(
      "postgres://x",
    );
  });

  it("throws CONFIG_INVALID when missing", () => {
    try {
      requireDatabaseUrl({});
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PlatformError);
      expect((e as PlatformError).code).toBe("CONFIG_INVALID");
    }
  });

  it("throws CONFIG_INVALID when blank", () => {
    expect(() => requireDatabaseUrl({ DATABASE_URL: "   " })).toThrowError(
      PlatformError,
    );
  });
});
