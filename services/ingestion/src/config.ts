import { PlatformError } from "@all-sport/core";

/**
 * Reads the required DATABASE_URL. Fails fast (CONFIG_INVALID) if absent — the
 * database is required infrastructure. Optional provider credentials are NOT read
 * here; their absence must never crash a process (it surfaces later as
 * PROVIDER_NOT_CONFIGURED).
 */
export function requireDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const url = env.DATABASE_URL;
  if (url === undefined || url.trim() === "") {
    throw new PlatformError({
      code: "CONFIG_INVALID",
      message: "DATABASE_URL is required but was not set",
    });
  }
  return url;
}
