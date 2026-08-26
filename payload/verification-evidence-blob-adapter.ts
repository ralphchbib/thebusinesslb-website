import type { Config, Plugin } from "payload";
import type { Adapter, GeneratedAdapter } from "@payloadcms/plugin-cloud-storage/types";
import { cloudStoragePlugin } from "@payloadcms/plugin-cloud-storage";
import { del, get, put } from "@vercel/blob";

/**
 * Phase 15 — PHASE15-EVIDENCE-STORAGE-REMEDIATION-PLAN.md. A custom, minimal
 * storage adapter for `VerificationEvidence`, deliberately not the official
 * `@payloadcms/storage-vercel-blob` plugin: that plugin's own type
 * definition states private-blob access is "currently... not supported" and
 * its `staticHandler` fetches file content with a plain, unauthenticated
 * `fetch()` — correct for the public blobs it was built for, wrong for a
 * private one, which requires the read-write token on every content read,
 * not just for metadata. This adapter uses the same `@vercel/blob` SDK
 * (already a transitive dependency of that plugin, now a direct one) with
 * `access: "private"` throughout, and reads content back with the SDK's own
 * authenticated `get()` — the function actually documented for this.
 *
 * Access control is untouched by this file: `@payloadcms/plugin-cloud-storage`
 * gates `staticHandler` behind the collection's own `access.read` before
 * ever calling it (confirmed by direct inspection of that package's
 * `plugin.js`), the same mechanism that already made local-disk storage's
 * static route correctly return 403 for anonymous/cross-account/moderator
 * requests. This file is a storage-layer swap only — it never grants or
 * checks access itself.
 */

const BLOB_ACCESS = "private" as const;

export const verificationEvidenceBlobAdapter: Adapter = ({ collection }) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  const adapter: GeneratedAdapter = {
    name: "verification-evidence-private-blob",

    handleUpload: async ({ file }) => {
      if (!token) {
        throw new Error("BLOB_READ_WRITE_TOKEN is not configured — cannot store verification evidence.");
      }
      const result = await put(file.filename, file.buffer, {
        access: BLOB_ACCESS,
        token,
        addRandomSuffix: true,
        allowOverwrite: false,
        contentType: file.mimeType,
      });
      // The blob's own pathname (not a fetchable public URL) becomes the
      // document's `filename` — it's what staticHandler below uses to look
      // the blob back up, and it's never rendered as a direct link anywhere.
      return { filename: result.pathname };
    },

    handleDelete: async ({ filename }) => {
      if (!token) return;
      try {
        await del(filename, { token });
      } catch {
        // Matches this codebase's existing tolerance for delete-of-missing-file
        // races elsewhere (e.g. deleteAssociatedFiles) — a evidence row being
        // removed should not fail because its blob was already gone.
      }
    },

    generateURL: ({ filename }) => {
      // Never a real public URL for a private blob — this value is only
      // ever used internally to build the path `staticHandler` receives
      // (`/api/verification-evidence/file/:filename`), never dereferenced
      // by a browser directly.
      return `/api/${collection.slug}/file/${encodeURIComponent(filename)}`;
    },

    staticHandler: async (req, { params: { filename } }) => {
      if (!token) {
        return new Response("Storage not configured.", { status: 500 });
      }
      try {
        const result = await get(filename, { access: BLOB_ACCESS, token });
        if (!result) {
          return new Response(null, { status: 404 });
        }
        const headers = new Headers();
        if (result.blob.contentType) headers.set("Content-Type", result.blob.contentType);
        if (result.blob.size != null) headers.set("Content-Length", String(result.blob.size));
        headers.set("Cache-Control", "private, no-store");
        return new Response(result.stream, { headers, status: 200 });
      } catch (err) {
        req.payload.logger.error({ err, msg: "verification-evidence-private-blob: staticHandler error" });
        return new Response(null, { status: 404 });
      }
    },
  };

  return adapter;
};

/**
 * Mirrors `vercelBlobStorage()`'s own conditional-enable shape exactly
 * (`payload.config.ts`'s existing comment on that plugin explains why: no
 * `BLOB_READ_WRITE_TOKEN` exists in local dev, so local dev keeps using
 * `VerificationEvidence.ts`'s own `staticDir` local-disk fallback — a
 * writable filesystem there, unlike Vercel's production serverless runtime
 * — completely unchanged from before this remediation). When a token *is*
 * present (production), this both registers the adapter above via the
 * lower-level `cloudStoragePlugin` and sets `disableLocalStorage: true` on
 * the collection — `cloudStoragePlugin` alone does not do the latter
 * automatically (confirmed by inspecting `vercelBlobStorage`'s own index.js,
 * which performs this exact same second step itself).
 */
export const verificationEvidencePrivateBlob = (): Plugin => (incomingConfig: Config) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return incomingConfig;

  const withDisabledLocalStorage: Config = {
    ...incomingConfig,
    collections: (incomingConfig.collections || []).map((collection) =>
      collection.slug === "verification-evidence"
        ? { ...collection, upload: { ...(typeof collection.upload === "object" ? collection.upload : {}), disableLocalStorage: true } }
        : collection
    ),
  };

  return cloudStoragePlugin({
    collections: {
      "verification-evidence": { adapter: verificationEvidenceBlobAdapter },
    },
  })(withDisabledLocalStorage);
};
