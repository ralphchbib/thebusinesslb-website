import { Badge } from "@/components/ui/badge";

/**
 * Phase 19 — same reasoning as SponsoredBadge, applied to Market Postings
 * (Blueprint §44 "Visibility Revenue" — "featured opportunities"). A
 * distinct label from "Sponsored" since a Featured listing is the
 * poster's own opportunity given priority placement, not a third-party ad
 * — but the same transparency requirement applies: visibly labeled, never
 * a silent ranking boost.
 */
export function FeaturedBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="brass"
      className={className}
      title="This listing has paid priority placement. It is still the poster's own genuine opportunity, not advertising content."
    >
      Featured
    </Badge>
  );
}
