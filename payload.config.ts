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
// Next.js app as the public site (no separate deployment).
//
// serverURL matters for more than cors/csrf: Payload's getRequestOrigin()
// (node_modules/payload/dist/utilities/getRequestOrigin.js) returns
// config.serverURL verbatim, with total precedence over the actual
// request's Origin/Host header, whenever it's set. It's what builds every
// absolute link Payload emails out — e.g. the password-reset link — so
// getting this wrong doesn't just risk a CORS error, it puts the wrong
// domain directly into a real outbound email.
//
// NODE_ENV alone can't distinguish "actually deployed to Vercel" from
// "npm run start, testing a production build locally" — both set
// NODE_ENV=production. Using it here previously sent password-reset links
// to the real production domain even when testing locally, 404ing because
// that domain has no deployment of this branch. VERCEL_ENV is only ever
// set by Vercel's own build/runtime, so it's used instead: real weight is
// only given to the production domain when a real Vercel production
// deployment is confirmed. Everything else — `next dev`, `next start`
// locally, and (unchanged from before) Vercel preview deployments — uses
// localhost.
const productionURL = siteConfig.url;
const localURL = "http://localhost:3000";
const serverURL = process.env.VERCEL_ENV === "production" ? productionURL : localURL;
// cors/csrf stay origin-agnostic across environments regardless of
// serverURL: `next start` and Vercel preview deployments both set
// NODE_ENV=production while serving from a different origin than the
// production domain, so both candidate origins are trusted explicitly.
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
