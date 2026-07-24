import { createHash } from "node:crypto";

/**
 * SHA-256 hex digest. Used for `raw_response_hash` provenance — a standard
 * cryptographic hash (never a home-grown checksum). Callers pass the raw response
 * BODY BYTES as received (uncompressed, headers excluded, retrieval timestamp
 * excluded). Passing a string hashes its UTF-8 bytes. See ADR-0004.
 */
export function sha256Hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}
