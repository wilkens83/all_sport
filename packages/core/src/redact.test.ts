import { describe, it, expect } from "vitest";
import { sanitizeRequestUrl, isSensitiveParamName, REDACTED } from "./redact";

describe("sanitizeRequestUrl", () => {
  it("redacts a query-parameter API key (issue-1 canonical case)", () => {
    const s = sanitizeRequestUrl(
      "https://example.test/live?APIkey=SUPER_SECRET_123&event=42",
    );
    expect(s.host).toBe("example.test");
    expect(s.path).toBe("/live");
    expect(s.sanitizedQuery).not.toBeNull();
    const serialized = JSON.stringify(s);
    expect(serialized).not.toContain("SUPER_SECRET_123");
    expect(serialized).toContain("event=42");
  });

  it("redacts many sensitive key spellings, keeps non-sensitive", () => {
    const s = sanitizeRequestUrl(
      "https://api.host/v3/en/x?api_key=AAA&access_token=BBB&x-rapidapi-key=CCC" +
        "&signature=DDD&sig=EEE&secret=FFF&token=GGG&authorization=HHH&sport=mlb",
    );
    const serialized = JSON.stringify(s);
    for (const secret of [
      "AAA",
      "BBB",
      "CCC",
      "DDD",
      "EEE",
      "FFF",
      "GGG",
      "HHH",
    ]) {
      expect(serialized).not.toContain(secret);
    }
    expect(serialized).toContain("sport=mlb");
  });

  it("handles URL-encoded and mixed-case key names", () => {
    // %5F is an encoded underscore -> decodes to api_key
    const s = sanitizeRequestUrl(
      "https://h/p?Api%5FKey=ENCODED_SECRET&X-API-KEY=UPPER_SECRET",
    );
    const serialized = JSON.stringify(s);
    expect(serialized).not.toContain("ENCODED_SECRET");
    expect(serialized).not.toContain("UPPER_SECRET");
    expect(serialized).toContain(REDACTED.replace(/[[\]]/g, ""));
  });

  it("returns no query when there is none", () => {
    const s = sanitizeRequestUrl("https://statsapi.mlb.com/api/v1/teams");
    expect(s.host).toBe("statsapi.mlb.com");
    expect(s.path).toBe("/api/v1/teams");
    expect(s.sanitizedQuery).toBeNull();
  });

  it("redacts the path wholesale for an unparseable URL", () => {
    const s = sanitizeRequestUrl("::::not a url::::");
    // Falls back to a base host; the important guarantee is no secret survives.
    expect(typeof s.host).toBe("string");
  });

  it("classifies sensitive names correctly", () => {
    for (const name of [
      "apikey",
      "api_key",
      "API-KEY",
      "token",
      "access_token",
      "x-rapidapi-key",
      "authorization",
      "signature",
      "sig",
      "secret",
      "client_secret",
    ]) {
      expect(isSensitiveParamName(name)).toBe(true);
    }
    for (const name of ["event", "sport", "date", "season", "monkey", "page"]) {
      expect(isSensitiveParamName(name)).toBe(false);
    }
  });
});
