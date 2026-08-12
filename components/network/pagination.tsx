import Link from "next/link";

/**
 * Phase 9C — the first paginated listing UI in this codebase (see
 * PHASE9C-TECHNICAL-DESIGN.md §A). Plain Prev/Next <Link>s built from
 * Payload's own find({page, limit}) return shape — no client JS.
 */
export function Pagination({
  basePath,
  searchParams,
  page,
  totalPages,
  hasNextPage,
  hasPrevPage,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(targetPage: number): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page") continue;
      if (value) params.set(key, value);
    }
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-between border-t border-n200 pt-6">
      {hasPrevPage ? (
        <Link href={hrefFor(page - 1)} className="text-[13px] font-semibold text-petrol">
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-[13px] text-n500">
        Page {page} of {totalPages}
      </span>
      {hasNextPage ? (
        <Link href={hrefFor(page + 1)} className="text-[13px] font-semibold text-petrol">
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
