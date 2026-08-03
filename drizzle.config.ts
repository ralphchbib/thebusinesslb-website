import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// "dotenv/config" defaults to loading ".env", not ".env.local" — Next.js's
// own env loading (which does read .env.local) doesn't apply here since
// drizzle-kit runs outside of Next.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local before running drizzle-kit commands.",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
