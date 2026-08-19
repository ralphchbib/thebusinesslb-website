import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema-org";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = buildMetadata({
  title: "THE BUSINESS Network | THE BUSINESS lb",
  description: "Browse the Business and Professional directories on THE BUSINESS Network, or join and create your own profile.",
  path: "/network/",
});

/**
 * Phase 9C — minimal hub, not data-driven (PHASE9C-TECHNICAL-DESIGN.md §B).
 * Just two links into the real directories plus the existing join/login
 * flow; no directory stats or counts shown here, same "honest and
 * data-driven" discipline as the homepage's Network Introduction section.
 */
export default function NetworkHubPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([{ name: "Network", path: "/network/" }])) }}
      />

      <Breadcrumb items={[{ name: "Network" }]} />

      <Section surface="white">
        <h1 className="font-display max-w-3xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          THE BUSINESS Network
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">
          Browse published businesses and professionals, or create your own profile.
        </p>
      </Section>

      <Section surface="mist">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="h-full bg-white">
            <Link href="/network/businesses" className="flex h-full flex-col">
              <h3 className="text-lg font-semibold text-ink">Business Directory</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-n600">
                Browse published Lebanese businesses by industry, category, location, services and language.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol">
                Browse businesses <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </Card>
          <Card className="h-full bg-white">
            <Link href="/network/professionals" className="flex h-full flex-col">
              <h3 className="text-lg font-semibold text-ink">Professional Directory</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-n600">
                Browse published Lebanese professionals by skill, category, location, services and language.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol">
                Browse professionals <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </Card>
          <Card className="h-full bg-white">
            <Link href="/network/opportunities" className="flex h-full flex-col">
              <h3 className="text-lg font-semibold text-ink">Opportunities</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-n600">
                Browse Offers and Needs posted by members — Blueprint §18 Offer and Need Exchange.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol">
                Browse opportunities <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </Card>
        </div>
      </Section>

      <Section surface="white">
        <h2 className="font-display text-2xl font-medium text-ink">Have a business or a professional practice?</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-n600">
          Join the network and create your profile to be listed here.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/register">Join the Network</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
