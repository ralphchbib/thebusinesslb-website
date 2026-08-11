import { ArrowRight } from "lucide-react";
import { Section } from "@/components/blocks/section";
import { Card } from "@/components/ui/card";
import { TrackedLink } from "@/components/analytics/tracked-cta";
import { getServicesByIds, getAllServices } from "@/lib/cms/services";
import type { PayloadServicesGridBlockDoc } from "@/lib/cms/types";

/**
 * Phase 6A — modeled on components/blocks/related-services.tsx's grid
 * pattern (Section/Card primitives, already proven) rather than
 * components/blocks/service-grid.tsx (too tightly coupled to Homepage's
 * featured/overrideBody/overrideBullets card shape). Leave the
 * relationship empty to show all published services — the same
 * "leave empty = fallback" convention already used by the Testimonials/
 * Case Studies blocks, just falling back to *all* published Services
 * since Services has no featured-flag concept.
 */
export async function PageServicesGridBlock({
  eyebrow,
  h2,
  intro,
  services,
}: Omit<PayloadServicesGridBlockDoc, "id" | "blockType" | "isVisible">) {
  const ids = (services ?? []).map((s) => (typeof s === "object" ? s.id : s));
  const items = ids.length > 0 ? await getServicesByIds(ids) : await getAllServices();
  if (items.length === 0) return null;

  return (
    <Section surface="mist">
      {eyebrow && (
        <p className="eyebrow mb-3.5">
          <span className="tb-rule tb-rule--petrol" />
          {eyebrow}
        </p>
      )}
      {h2 && (
        <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          {h2}
        </h2>
      )}
      {intro && <p className="measure-lead mt-4 text-[17px] leading-relaxed text-n700">{intro}</p>}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {items.map((svc) => (
          <Card key={svc.slug} className="h-full bg-white">
            <TrackedLink
              href={`/services/${svc.slug}/`}
              ctaId={`services_grid_${svc.slug}`}
              ctaLocation="page_builder_services_grid"
              className="flex h-full flex-col"
            >
              {svc.eyebrow && <p className="eyebrow mb-2">{svc.eyebrow}</p>}
              <h3 className="text-lg font-semibold text-ink">{svc.h1}</h3>
              <p className="mt-2 text-sm font-medium text-petrol">{svc.priceAnchor}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol">
                See what&rsquo;s included <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </TrackedLink>
          </Card>
        ))}
      </div>
    </Section>
  );
}
