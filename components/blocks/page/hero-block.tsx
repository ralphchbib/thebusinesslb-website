import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PayloadHeroBlockDoc } from "@/lib/cms/types";

/**
 * Phase 2 foundation Hero block — deliberately separate from the
 * homepage's Hero component (components/blocks/hero.tsx), which is
 * hardcoded to a specific image and copy. This one is prop-driven, no
 * image field (no media library exists yet — see PHASE2-ARCHITECTURE.md
 * §3 media note), for use on new landing/campaign/seasonal pages only.
 */
export function PageHeroBlock({
  eyebrow,
  h1,
  sub,
  ctaPrimaryLabel,
  ctaPrimaryHref,
  ctaSecondaryLabel,
  ctaSecondaryHref,
  reassurance,
}: Omit<PayloadHeroBlockDoc, "id" | "blockType" | "isVisible">) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-content px-6 py-16 text-center md:py-24 lg:px-10">
        {eyebrow && (
          <p className="eyebrow">
            <span className="tb-rule tb-rule--petrol" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-display mx-auto mt-5 max-w-3xl text-[32px] leading-[1.14] font-medium tracking-[-0.02em] text-ink md:text-[44px] lg:text-[56px] lg:leading-[1.08]">
          {h1}
        </h1>
        {sub && (
          <p className="measure-lead mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-n600 md:text-xl">
            {sub}
          </p>
        )}
        {(ctaPrimaryLabel || ctaSecondaryLabel) && (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {ctaPrimaryLabel && ctaPrimaryHref && (
              <Button asChild size="lg">
                <Link href={ctaPrimaryHref}>{ctaPrimaryLabel}</Link>
              </Button>
            )}
            {ctaSecondaryLabel && ctaSecondaryHref && (
              <Button asChild variant="secondary" size="lg">
                <Link href={ctaSecondaryHref}>{ctaSecondaryLabel}</Link>
              </Button>
            )}
          </div>
        )}
        {reassurance && <p className="mt-4 text-sm text-n500">{reassurance}</p>}
      </div>
    </section>
  );
}
