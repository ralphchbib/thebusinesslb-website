import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export interface HeroProps {
  eyebrow?: string;
  headline: string;
  highlightedText?: string;
  subheadline: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
  reassurance?: string;
  image: string;
  imageAlt: string;
}

/**
 * highlightedText must be an exact substring of headline (editor-facing
 * description on the field says so). If it isn't — empty, or doesn't
 * match — the headline renders as one plain text node, pixel-identical to
 * the pre-CMS design that had no highlight concept at all.
 */
function Headline({ headline, highlightedText }: { headline: string; highlightedText?: string }) {
  if (!highlightedText) return <>{headline}</>;
  const index = headline.indexOf(highlightedText);
  if (index === -1) return <>{headline}</>;
  const before = headline.slice(0, index);
  const after = headline.slice(index + highlightedText.length);
  return (
    <>
      {before}
      <span className="text-petrol">{highlightedText}</span>
      {after}
    </>
  );
}

export function Hero({
  eyebrow,
  headline,
  highlightedText,
  subheadline,
  ctaPrimaryLabel,
  ctaPrimaryHref,
  ctaSecondaryLabel,
  ctaSecondaryHref,
  reassurance,
  image,
  imageAlt,
}: HeroProps) {
  return (
    <section className="overflow-hidden bg-white">
      <div className="mx-auto grid max-w-content grid-cols-1 items-center gap-10 px-6 py-16 md:py-24 lg:grid-cols-[6fr_4fr] lg:gap-16 lg:px-10">
        <div>
          {eyebrow && (
            <p className="eyebrow mb-5">
              <span className="tb-rule tb-rule--petrol" />
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-[32px] leading-[1.14] font-medium tracking-[-0.02em] text-ink md:text-[44px] lg:text-[56px] lg:leading-[1.08]">
            <Headline headline={headline} highlightedText={highlightedText} />
          </h1>
          <p className="measure-lead mt-5 text-lg leading-relaxed text-n600 md:text-xl">{subheadline}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={ctaPrimaryHref}>{ctaPrimaryLabel}</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href={ctaSecondaryHref}>{ctaSecondaryLabel}</Link>
            </Button>
          </div>
          {reassurance && <p className="mt-4 text-sm text-n500">{reassurance}</p>}
        </div>

        <div>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-mist">
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
