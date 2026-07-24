import { z } from "zod";
import { PlatformError } from "@all-sport/core";

/**
 * Server-side environment schema. DATABASE_URL is required infrastructure —
 * validation fails fast without it. Provider credentials are OPTIONAL: their
 * absence must never crash the app (it surfaces later as PROVIDER_NOT_CONFIGURED).
 *
 * This module must only be imported from server components / route handlers. No
 * value here is ever sent to the client; the foundation page and health
 * endpoints expose configured booleans, never secrets.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SPORTRADAR_TENNIS_API_KEY: z.string().optional(),
  SPORTSDATAIO_TENNIS_API_KEY: z.string().optional(),
  API_TENNIS_API_KEY: z.string().optional(),
  TENNIS_API_RAPIDAPI_KEY: z.string().optional(),
  LOG_LEVEL: z.string().default("info"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Pure, injectable parse. Throws CONFIG_INVALID on required-var failure. */
export function parseServerEnv(
  env: Record<string, string | undefined>,
): ServerEnv {
  const parsed = serverEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new PlatformError({
      code: "CONFIG_INVALID",
      message: "Invalid server environment configuration",
      context: { issues: parsed.error.issues },
    });
  }
  return parsed.data;
}

let cached: ServerEnv | undefined;

/** Lazily validate + cache process.env. Lazy so it never runs at build time. */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

export interface ProviderConfigStatus {
  id: string;
  label: string;
  configured: boolean;
}

/**
 * Provider configuration status derived from env — booleans only, never the
 * secret values themselves.
 */
export function providerConfigStatuses(env: ServerEnv): ProviderConfigStatus[] {
  return [
    { id: "mlb-stats", label: "MLB Stats API", configured: true },
    { id: "baseball-savant", label: "Baseball Savant", configured: true },
    {
      id: "sportradar-tennis",
      label: "Sportradar Tennis v3",
      configured: env.SPORTRADAR_TENNIS_API_KEY !== undefined,
    },
    {
      id: "sportsdataio-tennis",
      label: "SportsDataIO Tennis",
      configured: env.SPORTSDATAIO_TENNIS_API_KEY !== undefined,
    },
    {
      id: "api-tennis",
      label: "api-tennis.com (Provider A)",
      configured: env.API_TENNIS_API_KEY !== undefined,
    },
    {
      id: "tennis-api-rapidapi",
      label: "tennis-api.com via RapidAPI (Provider B)",
      configured: env.TENNIS_API_RAPIDAPI_KEY !== undefined,
    },
  ];
}
