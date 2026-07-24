import { createDb, closeDb, pingDatabase } from "@all-sport/db";
import { getServerEnv } from "../../../../lib/env";
import { APP_VERSION } from "../../../../lib/version";

export const dynamic = "force-dynamic";

export interface DatabaseHealthResponse {
  status: "ok" | "error";
  database: "connected" | "disconnected";
  latencyMs: number | null;
  version: string;
  timestamp: string;
}

/**
 * Database liveness. Reports connectivity + latency only — never the connection
 * string, credentials, or any secret internals.
 */
export async function GET(): Promise<Response> {
  const db = createDb(getServerEnv().DATABASE_URL);
  try {
    const ping = await pingDatabase(db);
    const body: DatabaseHealthResponse = {
      status: ping.connected ? "ok" : "error",
      database: ping.connected ? "connected" : "disconnected",
      latencyMs: ping.latencyMs,
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
    };
    return Response.json(body, { status: ping.connected ? 200 : 503 });
  } finally {
    await closeDb(db);
  }
}
