import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

// Derived, not hardcoded — must never drift from lib/config.ts's
// siteConfig.url, which reads the same env var with the same fallback.
const siteHostname = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://thebusinesslb.com").hostname;

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Phase 4B — Media Library, corrected post-incident — see
    // INCIDENT-ROOT-CAUSE.md for the full trace. Payload's Media.url
    // field is always a fully-qualified URL through Payload's own
    // /api/media/file/ proxy route — built from `serverURL`, i.e. this
    // site's own domain — even when the underlying file is stored on
    // Vercel Blob. Confirmed by reading @payloadcms/plugin-cloud-storage's
    // afterRead hook source: it only links directly to the cloud
    // provider's own domain when `disablePayloadAccessControl: true` is
    // set on the storage adapter, which this project does not set. So
    // the *.public.blob.vercel-storage.com pattern below is not actually
    // exercised by the current configuration — kept for forward
    // compatibility in case that option is ever enabled — and the entry
    // that actually matters in production is this site's own domain,
    // added below. next/image treats any absolute URL as "remote"
    // regardless of whether it matches the current request's own host,
    // so without this entry every production image request fails with
    // INVALID_IMAGE_OPTIMIZE_REQUEST — confirmed live during the
    // incident, not assumed.
    remotePatterns: [
      { protocol: "https", hostname: siteHostname },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "http", hostname: "localhost", port: "3000" },
    ],
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
