/**
 * Secret redaction for anything derived from provider requests. Provider
 * credentials must NEVER be persisted to the database, logs, error context,
 * telemetry, or health responses. Some providers authenticate via query
 * parameters or URL tokens, so a raw request URL can carry a live key — we never
 * store a raw URL; we store host + path + a SANITIZED query.
 */

export const REDACTED = "[REDACTED]";

/**
 * Exact (normalized) sensitive parameter/header names. Normalization lowercases
 * and strips non-alphanumerics, so "X-Api-Key", "api_key", and "apiKey" all
 * collapse to "apikey".
 */
const SENSITIVE_EXACT: ReadonlySet<string> = new Set([
  "apikey",
  "apikeys",
  "key",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "auth",
  "xapikey",
  "xrapidapikey",
  "signature",
  "sig",
  "secret",
  "apisecret",
  "clientsecret",
  "password",
  "pwd",
  "passwd",
]);

/**
 * Substrings that, if present in a normalized name, force redaction. Catches
 * long-tail variants like `client_secret`, `refresh_token`, `x-rapidapi-key`.
 */
const SENSITIVE_SUBSTRINGS: readonly string[] = [
  "secret",
  "token",
  "password",
  "apikey",
  "signature",
  "authorization",
];

export function normalizeParamName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isSensitiveParamName(name: string): boolean {
  const normalized = normalizeParamName(name);
  if (SENSITIVE_EXACT.has(normalized)) {
    return true;
  }
  return SENSITIVE_SUBSTRINGS.some((s) => normalized.includes(s));
}

export interface SanitizedUrl {
  host: string;
  path: string;
  /** Redacted query string, or null when there is no query. */
  sanitizedQuery: string | null;
}

/**
 * Split a request URL into host + path + a query with every sensitive value
 * replaced by `[REDACTED]`. The returned parts are safe to persist and log.
 * If the URL cannot be parsed at all, the path is redacted wholesale rather than
 * risk leaking an embedded token.
 */
export function sanitizeRequestUrl(rawUrl: string): SanitizedUrl {
  let url: URL | undefined;
  try {
    url = new URL(rawUrl);
  } catch {
    try {
      url = new URL(rawUrl, "https://unknown.invalid");
    } catch {
      url = undefined;
    }
  }
  if (url === undefined) {
    return { host: "unknown.invalid", path: REDACTED, sanitizedQuery: null };
  }

  const source = new URLSearchParams(url.search);
  const out = new URLSearchParams();
  for (const [key, value] of source) {
    out.append(key, isSensitiveParamName(key) ? REDACTED : value);
  }
  const query = out.toString();
  return {
    host: url.host,
    path: url.pathname,
    sanitizedQuery: query.length > 0 ? query : null,
  };
}
