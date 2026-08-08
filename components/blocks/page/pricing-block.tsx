import Link from "next/link";
import { Check } from "lucide-react";
import { Section } from "@/components/blocks/section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PayloadPricingBlockDoc } from "@/lib/cms/types";

/**
 * Phase 6B — standalone landing-page pricing block. See
 * payload/blocks/Pricing.ts for why this is a self-contained array
 * rather than a relationship into Services.packages. Styled to match
 * components/blocks/packages-grid.tsx's proven Card layout.
 */
export function PagePricingBlock({
  eyebrow,
  h2,
  intro,
  tiers,
}: Omit<PayloadPricingBlockDoc, "id" | "blockType" | "isVisible">) {
  return (
    <Section surface="white">
      {eyebrow && (
        <p className="eyebrow mb-3.5">
          <span className="tb-rule tb-rule--petrol" />
          {eyebrow}
        </p>
      )}
      {h2 && (
        <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">{h2}</h2>
      )}
      {intro && <p className="measure-lead mt-4 text-[17px] leading-relaxed text-n700">{intro}</p>}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {tiers.map((tier, i) => (
          <Card
            key={tier.id ?? i}
            ruleColor={tier.isRecommended ? "brass" : "ink"}
            className={cn("h-full", tier.isRecommended && "border-ink")}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">{tier.name}</h3>
              {tier.isRecommended && <Badge variant="brass">Most chosen</Badge>}
            </div>
            <p className="font-display text-2xl font-medium text-ink">{tier.priceDisplay}</p>
            {tier.summary && <p className="mt-2 text-sm text-n600">{tier.summary}</p>}
            <ul className="mt-4 flex flex-1 flex-col gap-2">
              {tier.features.map((f, fi) => (
                <li key={f.id ?? fi} className="flex items-start gap-2 text-sm text-n700">
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-petrol" />
                  {f.text}
                </li>
              ))}
            </ul>
            {tier.ctaHref && (
              <Button asChild variant={tier.isRecommended ? "primary" : "secondary"} className="mt-6 w-full">
                <Link href={tier.ctaHref}>{tier.ctaLabel || "Get started"}</Link>
              </Button>
            )}
          </Card>
        ))}
      </div>
    </Section>
  );
}
