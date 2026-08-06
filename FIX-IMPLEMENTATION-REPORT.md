# Fix Implementation Report

Branch: `fix/homepage-image-remote-pattern` (off `main` @ `739e51b`, the Phase 4B merge commit currently live in production).

## Root cause

See `INCIDENT-ROOT-CAUSE.md` in full. Summary: `next.config.ts`'s `images.remotePatterns` was missing an entry for the site's own production domain — the domain Payload's Media `url` field always resolves to (via its `/api/media/file/` proxy route), regardless of storage backend.

## The fix — minimum safe change, one file

`next.config.ts`: added a `remotePatterns` entry for the site's own hostname, **derived from `NEXT_PUBLIC_SITE_URL` at config-build time rather than hardcoded**, so it can never drift from `lib/config.ts`'s `siteConfig.url` (same env var, same fallback):

```ts
const siteHostname = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://thebusinesslb.com").hostname;
...
remotePatterns: [
  { protocol: "https", hostname: siteHostname },
  { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
  { protocol: "http", hostname: "localhost", port: "3000" },
],
```

The existing two entries are unchanged. The corrected inline comment explains, for future maintainers, *why* the Blob-domain entry currently goes unused (no `disablePayloadAccessControl`) so this doesn't get re-discovered the hard way again.

**Why deriving instead of hardcoding `www.thebusinesslb.com`**: a literal string would fix today's incident but silently drift out of sync the moment `NEXT_PUBLIC_SITE_URL` ever changes (a domain migration, a new subdomain, etc.) — the exact same class of bug, recurring. Deriving it from the single source of truth this project already uses for the domain (the same env var `lib/config.ts` reads) closes that whole category, not just this one instance of it.

## Files changed

| File | Change |
|---|---|
| `next.config.ts` | +1 derived constant, +1 `remotePatterns` entry, corrected comment explaining the actual URL-resolution behavior |

No other file was touched. No collection, component, data-layer, or schema change was needed — confirmed in `INCIDENT-ROOT-CAUSE.md` §D/E that the actual rendering code path is already correct and doesn't need to change.

## Scope — what was deliberately *not* included

One genuine, separate gap was found during investigation (§G of the root-cause doc): `payload/collections/Media.ts` has no revalidation hook, unlike every other collection in this project, meaning a file replacement on an existing Media document alone (without also re-saving whatever references it) would not trigger revalidation of pages displaying it. **This is not the cause of this incident** (ruled out with direct evidence — the page's cached HTML already had the correct filename) and was not fixed here, per the instruction to implement the *minimum* safe fix for the *confirmed* root cause. Recommended as a fast-follow, not bundled into this incident fix.

## Risks

Minimal. This is a purely additive `remotePatterns` entry — it only *widens* what `next/image` will accept, and only to a domain that is already this site's own trusted origin (not a new external dependency). No existing passing request path is narrowed or changed. The derived-hostname approach introduces a small new failure mode in theory (`new URL()` throwing if `NEXT_PUBLIC_SITE_URL` were ever malformed) — mitigated by the existing `|| "https://thebusinesslb.com"` fallback already used identically in `lib/config.ts`, so the same guarantee that already protects the rest of the app protects this too.

## Rollback plan

`git revert` the fix commit — restores the pre-fix `remotePatterns` (2 entries) exactly. Zero data or schema involvement; this is a pure code/config change with no database impact, so rollback is a plain code revert with no additional steps.
