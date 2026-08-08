import { Check, Star, Zap, Shield, Rocket, Users, Target, TrendingUp, type LucideIcon } from "lucide-react";
import { Section } from "@/components/blocks/section";
import { Card } from "@/components/ui/card";
import type { PayloadFeatureGridBlockDoc, PayloadFeatureGridIcon } from "@/lib/cms/types";

// Fixed name->component map matching FeatureGridBlock's `icon` select
// options exactly (payload/blocks/FeatureGrid.ts) — a curated set rather
// than a free-text icon name, so a typo can't silently render nothing.
const ICONS: Record<PayloadFeatureGridIcon, LucideIcon> = {
  check: Check,
  star: Star,
  zap: Zap,
  shield: Shield,
  rocket: Rocket,
  users: Users,
  target: Target,
  "trending-up": TrendingUp,
};

export function PageFeatureGridBlock({
  eyebrow,
  h2,
  intro,
  features,
}: Omit<PayloadFeatureGridBlockDoc, "id" | "blockType" | "isVisible">) {
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
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => {
          const Icon = ICONS[feature.icon ?? "check"];
          return (
            <Card key={feature.id ?? i}>
              <Icon className="h-6 w-6 text-petrol" />
              <h3 className="mt-4 text-lg font-semibold text-ink">{feature.heading}</h3>
              <p className="mt-2 text-sm leading-relaxed text-n600">{feature.body}</p>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}
