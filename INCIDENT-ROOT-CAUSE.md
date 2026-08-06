# Incident Root Cause — Homepage Hero Image Broken Despite Working Media API

Every claim below is traced to source code or confirmed via a live request — nothing here is inferred without evidence.

## Summary

The homepage's hero/founder images were broken not because the file or the Media relationship was broken (both confirmed healthy), but because `next.config.ts`'s `images.remotePatterns` — the allowlist `next/image` checks before optimizing any absolute-URL image — did not include the site's **own production domain**. Payload's `Media.url` field is always a same-origin proxy URL through `/api/media/file/{filename}`, regardless of whether the file is stored on Vercel Blob or locally; it is *not* a direct link to Blob's own domain unless a specific opt-in option is set, which this project doesn't set. The `remotePatterns` list added in Phase 4B covered Blob's domain (never actually used) and `localhost` (dev-only) but not the one domain that's actually used in production.

## A. Most likely failure point — confirmed exact line of code

Traced live: requesting the exact URL used on the homepage —

```
GET https://www.thebusinesslb.com/_next/image/?url=https%3A%2F%2Fwww.thebusinesslb.com%2Fapi%2Fmedia%2Ffile%2FRalph-Chbib1.png&w=3840&q=75
→ 400 Bad request
  INVALID_IMAGE_OPTIMIZE_REQUEST
```

`INVALID_IMAGE_OPTIMIZE_REQUEST` is Next.js/Vercel's own error code for exactly one condition: the requested image's host is not present in `images.remotePatterns`/`images.domains`. This is not a guess — it's the literal error Vercel's image-optimization infrastructure returns for a domain-allowlist rejection, and it matches the observed symptom exactly (Media API works, `next/image` doesn't).

## B. Why it renders via the Media API but not on Homepage

`/api/media/file/{filename}` is Payload's own file-serving route (`node_modules/payload/dist/uploads/endpoints/getFile.js`) — it has no concept of `next/image` or `remotePatterns` at all; it just streams bytes once Payload's own access control passes. Once Blob storage was correctly activated (per the prior incident's fix), that route works directly, exactly as observed. The Homepage Hero, however, renders through `next/image` (`<Image src=... fill .../>` in `components/blocks/hero.tsx`), which performs its own, separate domain-allowlist check **before** it will even attempt to fetch the image — and that check is what's failing.

## C. What image URL the Homepage Hero component actually uses — confirmed by reading the code

`lib/cms/homepage.ts`:
```ts
function resolveMediaImage(media) {
  if (typeof media !== "object" || !media) return undefined;
  return { url: media.url, alt: media.alt };
}
...
image: heroImage?.url ?? "",
```
`media.url` is Payload's own resolved field — confirmed live to be `https://www.thebusinesslb.com/api/media/file/Ralph-Chbib1.png`. This is passed straight through as the `src` prop on the `<Image>` element in `hero.tsx`. Founder uses the identical path.

## D. Whether Homepage Hero depends on `sizes.hero.url` — no, confirmed by reading the code

`resolveMediaImage()` reads only `.url` and `.alt` off the Media object. It never accesses `.sizes` in any form. The `sizes.hero.url: null` observation from the reported facts is real (the 1200px "hero" size variant wasn't generated — the same non-upscaling behavior confirmed during Phase 4B's original implementation, since the source image is narrower than 1200px) but plays **no role** in this incident — nothing in the render path reads that field.

## E. Fallback behavior when `hero.url` is null

Not what's happening here (the URL is present and correctly threaded through — confirmed by the actual `srcSet` observed on the live page), but for completeness: if `resolveMediaImage()` received no media relationship at all, it returns `undefined`, and `image: heroImage?.url ?? ""` would pass an **empty string** to `<Image src="">`. That's a different, more obviously-broken failure mode (a browser-level empty-src error) than what was observed — another confirmation this incident is specifically the `remotePatterns` check, not a missing-relationship problem.

## F. Whether `next/image` optimization is failing — yes, directly confirmed

`400 Bad request`, `INVALID_IMAGE_OPTIMIZE_REQUEST`, reproduced live against production just now (see §A) and reproduced again in reverse — successfully — against the same real production URL from a local build carrying the fix (see `VALIDATION-REPORT.md`).

## G. Whether this is a cache/revalidation issue — no, ruled out with direct evidence

Fetched production's actual served homepage HTML directly: it already contains the correct, current filename (`Ralph-Chbib1.png`), proving the page *was* correctly revalidated after the image was updated in the CMS — the stale-cache hypothesis was tested and disproven, not assumed away. (A separate, real gap was noted in passing during this investigation — `payload/collections/Media.ts` has no revalidation hook, unlike every other collection in this project — but it is not the cause of this incident, since the specific edit that fixed the prior incident evidently did trigger revalidation, most likely because the Homepage global itself was re-saved. Flagged for awareness, intentionally not bundled into this fix — see `FIX-IMPLEMENTATION-REPORT.md` §Scope.)

## H. Whether this is a rendering bug introduced in Phase 4B — yes

`next.config.ts`'s `remotePatterns` is Phase 4B's own code. It was written under an incorrect assumption — that Vercel Blob-backed files would resolve to a direct `*.public.blob.vercel-storage.com` URL. Confirmed by reading `@payloadcms/plugin-cloud-storage`'s `afterRead` hook source (`node_modules/@payloadcms/plugin-cloud-storage/dist/hooks/afterRead.js`): the URL is only rewritten to point directly at the cloud provider when `disablePayloadAccessControl: true` is explicitly set on the storage adapter config — which `payload.config.ts` does not set. Without it, the URL always remains Payload's own `/api/media/file/` proxy path, i.e., this site's own domain — the one domain that was missing from the allowlist. This same class of bug (same-origin-but-still-"remote" absolute URLs) was correctly identified and fixed for local development during Phase 4B's own implementation (the `localhost:3000` entry) — but the fix was never generalized to the production domain, because the original implementation had no way to test against the real production domain from its local environment.

## Root cause, stated once, precisely

`next.config.ts`'s `images.remotePatterns` lacked an entry for the site's own production hostname, which is the domain Payload's Media `url` field always resolves to via its built-in `/api/media/file/` proxy route (confirmed via source, not the storage-adapter's own domain, since `disablePayloadAccessControl` is unset). `next/image` treats any absolute URL as remote regardless of whether it matches the current request's own host, so every homepage/founder image request was rejected with `INVALID_IMAGE_OPTIMIZE_REQUEST` before ever attempting to fetch the (now-working) underlying file.
