import { Badge } from "@/components/ui/badge";

/**
 * Phase 10 — deliberately spells out what the badge does and doesn't mean
 * inline (title attribute), per the Blueprint §10 transparency requirement
 * and this phase's own honesty constraint: this is a staff review of a
 * submitted statement, not a registry/KYC check.
 */
export function VerifiedBadge({ verifiedAt, className }: { verifiedAt?: string; className?: string }) {
  const title = verifiedAt
    ? `Reviewed and verified by THE BUSINESS lb staff on ${new Date(verifiedAt).toLocaleDateString()}. This checks what the profile owner told us, not a registry or credential — it doesn't guarantee ongoing quality.`
    : "Reviewed and verified by THE BUSINESS lb staff. This checks what the profile owner told us, not a registry or credential — it doesn't guarantee ongoing quality.";

  return (
    <Badge variant="petrol" className={className} title={title}>
      ✓ Verified
    </Badge>
  );
}
