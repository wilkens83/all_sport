import { createDb } from "@all-sport/db";
import { getServerEnv } from "./env";

type Db = ReturnType<typeof createDb>;

// Cache the Kysely instance across requests/HMR so we don't open a pool per render.
declare global {
  // eslint-disable-next-line no-var
  var __allSportDb: Db | undefined;
}

export function getDb(): Db {
  globalThis.__allSportDb ??= createDb(getServerEnv().DATABASE_URL);
  return globalThis.__allSportDb;
}
