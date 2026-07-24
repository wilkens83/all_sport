import { z } from "zod";
import { err, ok, PlatformError, type Result } from "@all-sport/core";

/**
 * Generic runtime-validation wrapper for provider boundaries. Returns a Result
 * instead of throwing, and maps validation failures to a stable
 * PROVIDER_SCHEMA_MISMATCH error carrying the Zod issues as context — so a
 * malformed provider payload degrades gracefully instead of crashing ingestion.
 */
export function validate<T>(
  schema: z.ZodType<T>,
  input: unknown,
  options?: { provider?: string },
): Result<T, PlatformError> {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return ok(parsed.data);
  }
  const provider = options?.provider;
  return err(
    new PlatformError({
      code: "PROVIDER_SCHEMA_MISMATCH",
      message: "Runtime schema validation failed",
      ...(provider !== undefined ? { provider } : {}),
      context: { issues: parsed.error.issues },
    }),
  );
}
