import type { CollectionConfig } from "payload";
import { anyone, adminOrEditor, adminOnly } from "../access";

/**
 * Phase 4B. A real, reusable media library backing every image field that
 * used to be a plain text/URL string: Testimonials.logo, CaseStudies.
 * featuredImage/gallery, Homepage.heroImage/founderImage. See
 * MEDIA-ARCHITECTURE.md for the full design.
 *
 * Storage is delegated entirely to the vercelBlobStorage plugin registered
 * in payload.config.ts — nothing here names a storage backend directly, so
 * this collection's definition is identical whether Blob is active
 * (production, once BLOB_READ_WRITE_TOKEN exists) or the plugin is
 * disabled and Payload falls back to its own local-disk storage (this
 * local dev environment, which has no such token).
 */
export const Media: CollectionConfig = {
  slug: "media",
  admin: {
    useAsTitle: "alt",
  },
  access: {
    read: anyone,
    create: adminOrEditor,
    update: adminOrEditor,
    delete: adminOnly,
  },
  upload: {
    // Only used when the Vercel Blob plugin is disabled (no
    // BLOB_READ_WRITE_TOKEN — see payload.config.ts) and Payload falls back
    // to local-disk storage, i.e. local development only. Gitignored —
    // never committed, never relied on in production.
    staticDir: "media-uploads",
    mimeTypes: ["image/*"],
    imageSizes: [
      // Admin-panel picker grid thumbnail.
      { name: "thumbnail", width: 300, height: 300, position: "centre" },
      // Testimonial logos / case study cards.
      { name: "card", width: 600 },
      // Homepage hero/founder full-size usage.
      { name: "hero", width: 1200 },
    ],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      admin: {
        description:
          "Required — used as this image's accessibility text everywhere it's used. Set it once here rather than per-use.",
      },
    },
  ],
};
