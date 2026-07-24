/**
 * Version + config-checksum primitives for provenance. Projections (later phases)
 * must be reproducible from a pinned code + config state, so we need a stable,
 * dependency-free way to stamp component versions and checksum a config object.
 */

export interface VersionStamp {
  readonly component: string;
  readonly version: string;
}

export function makeVersion(component: string, version: string): VersionStamp {
  return { component, version };
}

/**
 * Deterministic JSON stringification with sorted object keys, so two logically
 * equal configs always produce the same string (and thus the same checksum).
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, val]) => [key, sortValue(val)] as const);
    return Object.fromEntries(entries);
  }
  return value;
}

/**
 * FNV-1a 32-bit checksum (hex) over the stable stringification of a config.
 * Dependency-free and deterministic — suitable as a provenance `config_checksum`.
 */
export function configChecksum(config: unknown): string {
  const input = stableStringify(config);
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // FNV prime 16777619, kept in 32-bit range via Math.imul.
    hash = Math.imul(hash, 0x01000193);
  }
  // Coerce to unsigned 32-bit and hex-encode.
  return (hash >>> 0).toString(16).padStart(8, "0");
}
