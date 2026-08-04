import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";

import { Users } from "@/payload/collections/Users";
import { Services } from "@/payload/collections/Services";
import { Articles } from "@/payload/collections/Articles";
import { FAQs } from "@/payload/collections/FAQs";
import { Navigation } from "@/payload/collections/Navigation";
import { SiteSettings } from "@/payload/globals/SiteSettings";
import { siteConfig } from "@/lib/config";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Fail fast, matching the DATABASE_URL check in lib/db/client.ts. Without
// this, Payload would boot anyway and sign every admin auth cookie/JWT with
// an empty string — a silently-forgeable session, not a startup error.
const payloadSecret = process.env.PAYLOAD_SECRET;
if (!payloadSecret) {
  throw new Error("PAYLOAD_SECRET is not set. Add it to your environment — see .env.example.");
}

// Payload's admin panel and REST/GraphQL API are served from the same
// Next.js app as the public site (no separate deployment). serverURL is
// used to build absolute links (e.g. in password-reset email), so it's set
// to the real production domain whenever NODE_ENV is "production" —
// falling back to the local dev server's origin otherwise (`next dev`).
//
// cors/csrf are deliberately NOT derived from NODE_ENV alone: `next start`
// (used to test a production build locally, and by Vercel preview
// deployments) also sets NODE_ENV=production while the browser's actual
// origin is still localhost/preview, not the production domain. Payload's
// CSRF check rejects every admin mutation (403) if the request's Origin
// isn't in this list, regardless of what serverURL resolves to — so both
// candidate origins are trusted explicitly, in every environment.
const productionURL = siteConfig.url;
const localURL = "http://localhost:3000";
const serverURL = process.env.NODE_ENV === "production" ? productionURL : localURL;
const trustedOrigins = [productionURL, localURL];

export default buildConfig({
  secret: payloadSecret,
  serverURL,
  cors: trustedOrigins,
  csrf: trustedOrigins,
  admin: {
    user: Users.slug,
  },
  collections: [Users, Services, Articles, FAQs, Navigation],
  globals: [SiteSettings],
  graphQL: {
    // This is Payload's own default — set explicitly so the production/
    // development split is visible in code and independently verifiable,
    // rather than relying on an implicit default.
    disablePlaygroundInProduction: true,
  },
  // No collection here uses a `richText` field (long copy uses `textarea`,
  // matching the plain-string content model already in content/*.ts), so
  // no default editor is configured — keeps the dependency footprint
  // smaller and avoids an ESM/CJS loader incompatibility between Payload's
  // CLI and @payloadcms/richtext-lexical under Node 24.
  typescript: {
    outputFile: path.resolve(dirname, "payload/payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || "",
    },
    // Isolated from the existing lead-capture schema (public) — additive
    // only, nothing here can touch assessment_applications / contact_
    // submissions / newsletter_subscribers.
    schemaName: "cms",
  }),
  // Reuses the same Resend account as the lead-capture forms
  // (lib/email/send.ts) — powers admin password-reset/verification email,
  // which previously only logged to the console and was never delivered.
  email: resendAdapter({
    apiKey: process.env.RESEND_API_KEY || "",
    defaultFromAddress: process.env.RESEND_FROM_EMAIL || siteConfig.email,
    defaultFromName: siteConfig.name,
  }),
});
