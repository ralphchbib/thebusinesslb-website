/**
 * Phase 5A — shown site-wide (rendered from the root layout) whenever
 * Draft Mode is on, so a draft preview is never visually indistinguishable
 * from the live site. "Exit Preview" links to /api/exit-draft with no
 * `path` param — the root layout has no supported way to read the
 * current pathname (Next's App Router deliberately doesn't pass it to
 * layouts, only to the page/generateMetadata for the matched segment),
 * so it falls back to that route's own "/" default rather than reaching
 * for an undocumented internal header to guess it. No client-side state,
 * matching this codebase's existing preference for server-rendered,
 * non-interactive elements wherever a client component isn't needed.
 */
export function PreviewBanner() {
  return (
    <div className="flex items-center justify-center gap-3 border-b border-warning bg-warning-tint px-4 py-2 text-center text-sm font-medium text-ink">
      <span>Preview mode — viewing draft content, hidden from search engines.</span>
      {/* Deliberately a plain <a>, not next/link's <Link>: this points at a
          Route Handler with a side effect (disabling Draft Mode), and
          Link's prefetch-on-viewport/hover behavior could fire that GET
          before the user actually clicks. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/api/exit-draft" className="font-semibold text-warning underline underline-offset-2 hover:no-underline">
        Exit preview
      </a>
    </div>
  );
}
