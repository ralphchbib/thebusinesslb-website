import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";

import { Users } from "./payload/collections/Users";
import { Services } from "./payload/collections/Services";
import { Articles } from "./payload/collections/Articles";
import { FAQs } from "./payload/collections/FAQs";
import { Navigation } from "./payload/collections/Navigation";
import { SiteSettings } from "./payload/globals/SiteSettings";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || "",
  admin: {
    user: Users.slug,
  },
  collections: [Users, Services, Articles, FAQs, Navigation],
  globals: [SiteSettings],
  editor: lexicalEditor(),
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
});
