import { APP_VERSION } from "../../../lib/version";

export const dynamic = "force-dynamic";

export interface HealthResponse {
  status: "ok";
  version: string;
  timestamp: string;
}

/** Application liveness. Never exposes secrets or connection details. */
export function GET(): Response {
  const body: HealthResponse = {
    status: "ok",
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  };
  return Response.json(body);
}
