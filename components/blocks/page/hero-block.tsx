import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { PayloadHeroBlockDoc } from "@/lib/cms/types";

/**
 * Phase 2 foundation Hero block — deliberately separate from the
 * homepage's Hero component (components/blocks/hero.tsx), which is
 * hardcoded to a specific image and copy. This one is prop-driven, for
 * use on new landing/campaign/seasonal pages.
 *
 * Phase 6A — gained an optional backgroundImage. Rendered as a `fill`
 * background with a dark overlay for text legibility; when absent, the
 * section renders exactly as it always has (plain white background) —
 * fully backward-compatible.
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
  backgroundImage,
}: Omit<PayloadHeroBlockDoc, "id" | "blockType" | "isVisible">) {
  const image = typeof backgroundImage === "object" && backgroundImage ? backgroundImage : undefined;

  return (
    <section className={`relative overflow-hidden ${image ? "" : "bg-white"}`}>
      {image && (
        <>
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-ink/60" />
        </>
      )}
      <div className="relative mx-auto max-w-content px-6 py-16 text-center md:py-24 lg:px-10">
        {eyebrow && (
          <p className={`eyebrow ${image ? "text-white" : ""}`}>
            <span className="tb-rule tb-rule--petrol" />
            {eyebrow}
          </p>
        )}
        <h1
          className={`font-display mx-auto mt-5 max-w-3xl text-[32px] leading-[1.14] font-medium tracking-[-0.02em] md:text-[44px] lg:text-[56px] lg:leading-[1.08] ${
            image ? "text-white" : "text-ink"
          }`}
        >
          {h1}
        </h1>
        {sub && (
          <p
            className={`measure-lead mx-auto mt-5 max-w-2xl text-lg leading-relaxed md:text-xl ${
              image ? "text-white/85" : "text-n600"
            }`}
          >
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
        {reassurance && (
          <p className={`mt-4 text-sm ${image ? "text-white/70" : "text-n500"}`}>{reassurance}</p>
        )}
      </div>
    </section>
  );
}
