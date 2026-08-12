import Link from "next/link";
import { Section } from "./section";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";
import { networkIntro } from "@/content/home";

/**
 * Phase 9 — introduces THE BUSINESS Network and points visitors at the two
 * real, live things Phase 9A/9B shipped: creating an account and building
 * a profile. Deliberately no directory preview, featured profiles, counts,
 * or activity — none of that exists yet. See PHASE9-HOMEPAGE-ALIGNMENT.md.
 */
export function NetworkIntro() {
  return (
    <Section surface="mist">
      <Reveal>
        <Eyebrow>{networkIntro.eyebrow}</Eyebrow>
        <div className="mt-3.5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
              {networkIntro.h2}
            </h2>
            <p className="measure mt-4 text-[17px] leading-relaxed text-n700">{networkIntro.body}</p>
          </div>
          <div className="flex flex-none flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <Link href="/register/">{networkIntro.joinCta}</Link>
            </Button>
            <Link href="/login/" className="text-[13px] font-semibold text-petrol">
              {networkIntro.loginCta}
            </Link>
          </div>
        </div>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        {networkIntro.cards.map((card, i) => (
          <Reveal key={card.label} delay={0.08 * (i + 1)}>
            <div className="flex h-full flex-col rounded-lg border border-n200 bg-white p-8">
              <span className="eyebrow text-[13px] text-n500">{card.label}</span>
              <h3 className="font-display mt-2 text-[20px] font-medium text-ink">{card.h3}</h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-n700">{card.body}</p>
              <Button asChild variant="secondary" className="mt-6 w-full sm:w-auto">
                <Link href="/register/">{card.cta}</Link>
              </Button>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
