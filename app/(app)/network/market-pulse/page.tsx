import type { Metadata } from "next";
import { getNetworkUser } from "@/lib/network/session";
import { getPublicMarketPulseInsights, getInstitutionalMarketPulseInsights, hasInstitutionalMarketPulseAccess, type MarketPulseInsight } from "@/lib/network/market-pulse";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema-org";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = buildMetadata({
  title: "Market Pulse | THE BUSINESS lb",
  description: "Aggregated, privacy-conscious intelligence about the Lebanese market — Blueprint §37 Market Pulse.",
  path: "/network/market-pulse/",
});

const INSIGHT_COPY: Record<MarketPulseInsight["insightType"], { title: string; description: string }> = {
  industry: { title: "Industry Insights", description: "Where active businesses on the Network are concentrated." },
  opportunity: { title: "Opportunity Trends", description: "What businesses and professionals are offering and needing." },
  "service-demand": { title: "Service Demand Trends", description: "The most common services offered and skills listed." },
  regional: { title: "Regional Trends", description: "Where Network activity is happening." },
  "crm-aggregate": { title: "CRM Aggregated Insights", description: "Network-wide pipeline shape — never any single business's own data." },
};

const INSIGHT_ORDER: MarketPulseInsight["insightType"][] = ["industry", "opportunity", "service-demand", "regional", "crm-aggregate"];

function InsightCard({ insight }: { insight: MarketPulseInsight }) {
  const copy = INSIGHT_COPY[insight.insightType];
  const sorted = [...insight.buckets].sort((a, b) => b.count - a.count);
  return (
    <Card className="h-full bg-white">
      <h3 className="text-lg font-semibold text-ink">{copy.title}</h3>
      <p className="mt-1 text-[13px] text-n500">{copy.description}</p>
      {sorted.length === 0 ? (
        <p className="mt-4 text-[13px] text-n500">Not enough Network activity yet to publish this insight.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {sorted.map((bucket, i) => (
            <li key={`${bucket.group ?? ""}-${bucket.label}-${i}`} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="text-n700">
                {bucket.label}
                {bucket.group && bucket.group !== "rate" && <span className="ml-2 text-n500">({bucket.group})</span>}
              </span>
              <Badge variant="neutral">{bucket.count}</Badge>
            </li>
          ))}
        </ul>
      )}
      {insight.suppressedCount > 0 && (
        <p className="mt-4 text-[12px] text-n500">
          {insight.suppressedCount} additional {insight.suppressedCount === 1 ? "category is" : "categories are"} withheld to protect individual privacy — see Blueprint §56.
        </p>
      )}
    </Card>
  );
}

/**
 * Phase 17 — Blueprint §37 Market Pulse (PHASE17-TECHNICAL-DESIGN.md §F).
 * One page, tiered by viewer: the Public Insights section renders for
 * everyone, including anonymous visitors; the Institutional section below
 * it renders only for a logged-in network account with
 * `accountType: "institution"` and a staff-granted
 * `marketPulseAccessGranted`. No separate `/dashboard/market-pulse` route —
 * a single page avoids duplicating the same rendering logic across two
 * templates for what is, at the data layer, one gated read.
 */
export default async function MarketPulsePage() {
  const user = await getNetworkUser();
  const institutionalAccess = hasInstitutionalMarketPulseAccess(user);

  const [publicInsights, institutionalInsights] = await Promise.all([
    getPublicMarketPulseInsights(),
    institutionalAccess ? getInstitutionalMarketPulseInsights() : Promise.resolve<MarketPulseInsight[]>([]),
  ]);

  const orderedPublic = INSIGHT_ORDER.map((type) => publicInsights.find((i) => i.insightType === type)).filter((i): i is MarketPulseInsight => Boolean(i));
  const orderedInstitutional = INSIGHT_ORDER.map((type) => institutionalInsights.find((i) => i.insightType === type)).filter((i): i is MarketPulseInsight => Boolean(i));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([{ name: "Market Pulse", path: "/network/market-pulse/" }])) }}
      />

      <Breadcrumb items={[{ name: "Market Pulse" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-3xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">Market Pulse</h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">
          Aggregated, privacy-conscious intelligence about the Lebanese market — Blueprint §37. THE BUSINESS never sells private or
          individually identifiable information; every number here is a count across many accounts, never a reference to any one of them.
        </p>
      </Section>

      <Section surface="mist">
        {orderedPublic.length === 0 ? (
          <p className="text-[15px] text-n500">Not enough Network activity yet to publish market insights.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orderedPublic.map((insight) => (
              <InsightCard key={insight.insightType} insight={insight} />
            ))}
          </div>
        )}
      </Section>

      {institutionalAccess && (
        <Section surface="veil">
          <h2 className="font-display text-2xl font-medium text-ink">Institutional Dashboard</h2>
          <p className="mt-2 text-[14px] text-n600">
            A fuller breakdown, available because {user?.name}&rsquo;s institution account has been granted Market Pulse access.
          </p>
          {orderedInstitutional.length === 0 ? (
            <p className="mt-6 text-[15px] text-n500">Not enough Network activity yet to publish market insights.</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {orderedInstitutional.map((insight) => (
                <InsightCard key={insight.insightType} insight={insight} />
              ))}
            </div>
          )}
        </Section>
      )}
    </>
  );
}
