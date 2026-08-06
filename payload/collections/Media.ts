import type { CollectionConfig } from "payload";
import { anyone, adminOrEditor, adminOnly } from "../access";
import { revalidateAfterChange, revalidateAfterDelete } from "../hooks/revalidate";

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
 *
 * Phase 4B.2 — revalidation reuses the same site-wide hooks Testimonials/
 * Case Studies use, and for the identical reason (see the comment in
 * Testimonials.ts): a Media document can be referenced from an unbounded
 * number of places — Homepage's hero/founder/OG images, any Testimonial's
 * logo, any Case Study's featured image or gallery — with no practical
 * way to enumerate which pages currently use a given one at hook-
 * execution time. This was a real gap until now: editing or replacing a
 * file directly in the Media library (the library's whole point — reuse
 * without re-uploading) previously revalidated nothing, so the change
 * stayed invisible until whatever referenced it was separately re-saved.
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
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
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
