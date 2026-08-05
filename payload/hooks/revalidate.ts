import { revalidatePath } from "next/cache";
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from "payload";

/**
 * Payload runs inside the same Next.js server process as the public site
 * (see lib/cms/client.ts), so hooks can call revalidatePath directly — no
 * separate webhook or API round trip needed.
 *
 * Every collection/global hook below revalidates the same target:
 * `("/", "layout")`, which invalidates every route under
 * app/(app)/layout.tsx in one call. That shared layout is where Navigation,
 * Site Settings (via the Footer) and Services (the sticky action bar's
 * price map) are all fetched — so nearly any content edit already has
 * site-wide surface. Hand-mapping a narrower per-page fan-out (which
 * service appears as "related" on which article, which FAQ scope maps to
 * which page, etc.) would still have to fall back to a full-layout
 * revalidation for those three, while adding real risk of missing a path
 * and leaving stale content live on it.
 *
 * Pages stay statically generated: this only marks the cached output
 * stale, so the next visit re-renders with fresh data. There's no
 * redeploy and no background/time-based regeneration.
 */
function revalidateSite() {
  try {
    revalidatePath("/", "layout");
  } catch (err) {
    // A cache-invalidation failure must never block the CMS write itself —
    // same fail-soft convention as outbound email (lib/email/send.ts).
    console.error("[cms:revalidate:error]", err);
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  revalidateSite();
  return doc;
};

export const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidateSite();
  return doc;
};

export const revalidateGlobalAfterChange: GlobalAfterChangeHook = ({ doc }) => {
  revalidateSite();
  return doc;
};

/**
 * Pages (unlike Services/Navigation/Site Settings) are not fetched by the
 * shared root layout, so a site-wide revalidation would be needlessly
 * broad — only the page's own path, plus the sitemap, ever change when a
 * Page is edited.
 */
function revalidatePaths(paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (err) {
      console.error(`[cms:revalidate:error] path=${path}`, err);
    }
  }
}

export const revalidatePageAfterChange: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  const paths = [`/${doc.slug}/`, "/sitemap.xml"];
  // Revalidate the old URL too if the slug changed, so it stops serving
  // stale cached content instead of a 404 once the rename takes effect.
  if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
    paths.push(`/${previousDoc.slug}/`);
  }
  revalidatePaths(paths);
  return doc;
};

export const revalidatePageAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidatePaths([`/${doc.slug}/`, "/sitemap.xml"]);
  return doc;
};
