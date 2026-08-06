import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Phase 4B — Media Library. Vercel Blob serves uploaded files from a
    // per-store subdomain of this pattern; next/image refuses to optimize
    // any remote host not explicitly listed here.
    //
    // The localhost entry is for the local-disk upload fallback only
    // (used when BLOB_READ_WRITE_TOKEN is absent — see payload.config.ts).
    // Confirmed live, not assumed: Payload's Media.url field is always a
    // fully-qualified URL built from `serverURL` (http://localhost:3000
    // locally), even for same-host local-disk storage — next/image treats
    // any absolute URL as "remote" regardless of host, so without this
    // entry it rejects the image with "url parameter is not allowed"
    // rather than silently treating same-origin as safe. Irrelevant in
    // real production, where Blob's own https:// URLs are already covered
    // by the pattern above.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "http", hostname: "localhost", port: "3000" },
    ],
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
