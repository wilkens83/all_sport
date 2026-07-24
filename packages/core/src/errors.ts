/**
 * Structured error taxonomy. Every failure in the platform carries a stable
 * machine-readable `code`, a human message, retryability, the provider it relates
 * to (when relevant), and free-form context. No code path should branch on
 * string-matched messages — branch on `code` instead.
 */

export const ERROR_CODES = [
  "PROVIDER_NOT_CONFIGURED",
  "PROVIDER_AUTH_FAILED",
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_TIMEOUT",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_SCHEMA_MISMATCH",
  "DATA_STALE",
  "DATA_INVALID",
  "IDENTITY_UNRESOLVED",
  "DATABASE_ERROR",
  "CONFIG_INVALID",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Codes for which a retry (with backoff) is a reasonable strategy by default. */
const DEFAULT_RETRYABLE: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_TIMEOUT",
  "PROVIDER_UNAVAILABLE",
  "DATABASE_ERROR",
]);

export function isRetryableCode(code: ErrorCode): boolean {
  return DEFAULT_RETRYABLE.has(code);
}

export interface PlatformErrorOptions {
  code: ErrorCode;
  message: string;
  provider?: string;
  /** Overrides the default retryability implied by `code`. */
  retryable?: boolean;
  context?: Record<string, unknown>;
  cause?: unknown;
}

export interface PlatformErrorJson {
  name: "PlatformError";
  code: ErrorCode;
  message: string;
  retryable: boolean;
  provider: string | undefined;
  context: Record<string, unknown> | undefined;
}

/**
 * The single error type crossing platform boundaries. Declared fields use
 * `T | undefined` (not `field?: T`) so they interoperate cleanly with
 * `exactOptionalPropertyTypes`.
 */
export class PlatformError extends Error {
  override readonly name = "PlatformError";
  readonly code: ErrorCode;
  readonly provider: string | undefined;
  readonly retryable: boolean;
  readonly context: Record<string, unknown> | undefined;

  constructor(options: PlatformErrorOptions) {
    super(
      options.message,
      options.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.code = options.code;
    this.provider = options.provider;
    this.retryable = options.retryable ?? isRetryableCode(options.code);
    this.context = options.context;
  }

  toJSON(): PlatformErrorJson {
    return {
      name: "PlatformError",
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      provider: this.provider,
      context: this.context,
    };
  }
}

export function isPlatformError(value: unknown): value is PlatformError {
  return value instanceof PlatformError;
}
