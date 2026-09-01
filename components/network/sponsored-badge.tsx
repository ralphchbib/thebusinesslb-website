import { Badge } from "@/components/ui/badge";

/**
 * Phase 19 — Blueprint §56 "Sponsored placement must be visibly labeled"
 * and "The platform must distinguish editorial content from advertising."
 * Mirrors VerifiedBadge's own shape: spells out what the label means
 * inline (title attribute), not just a bare word, so a viewer can't
 * mistake it for a quality signal.
 */
export function SponsoredBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="brass"
      className={className}
      title="This listing is a paid placement, not an editorial recommendation or a quality signal."
    >
      Sponsored
    </Badge>
  );
}
