import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// Cached on `globalThis` so dev-mode hot reloads reuse one connection pool
// instead of leaking a new one on every edit.
declare global {
  var __tbPgClient: postgres.Sql | undefined;
  var __tbDb: Db | undefined;
}

/**
 * Lazily creates the Drizzle client on first use rather than at module load.
 * `next build` imports this module while bundling server actions; if it
 * connected eagerly, a missing DATABASE_URL would fail the production build
 * itself instead of failing gracefully at request time, where the calling
 * server action can catch it and show the visitor a real error.
 */
export function getDb(): Db {
  if (globalThis.__tbDb) return globalThis.__tbDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment — see .env.example.",
    );
  }

  // `prepare: false` is required against Supabase's transaction pooler
  // (port 6543), which doesn't support prepared statements. Safe to leave
  // on for direct/session connections too.
  const client = postgres(connectionString, { prepare: false, ssl: "require" });
  const db = drizzle(client, { schema });

  globalThis.__tbPgClient = client;
  globalThis.__tbDb = db;
  return db;
}
