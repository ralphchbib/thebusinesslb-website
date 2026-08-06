import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Section } from "./section";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";
import type { HomepageServiceCard } from "@/lib/cms/homepage";

export interface ServiceGridProps {
  eyebrow?: string;
  title: string;
  intro: string;
  cards: HomepageServiceCard[];
}

export function ServiceGrid({ eyebrow, title, intro, cards }: ServiceGridProps) {
  const featured = cards.filter((c) => c.featured);
  const rest = cards.filter((c) => !c.featured);

  return (
    <Section surface="mist">
      <Reveal>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="font-display mt-3.5 text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          {title}
        </h2>
        <p className="measure-lead mt-4 text-[17px] leading-relaxed text-n700">{intro}</p>
      </Reveal>

      {featured.length > 0 && (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {featured.map((card) => {
            const href = `/services/${card.service.slug}/`;
            const body = card.overrideBody ?? card.service.intro;
            return (
              <Reveal key={href}>
                <Card ruleColor="petrol" className="h-full bg-white">
                  <Link href={href} className="flex h-full flex-col">
                    {card.service.eyebrow && <p className="eyebrow mb-3">{card.service.eyebrow}</p>}
                    <h3 className="text-xl font-semibold text-ink">{card.service.h1}</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-n700">{body}</p>
                    {card.overrideBullets.length > 0 && (
                      <ul className="mt-4 flex flex-col gap-2">
                        {card.overrideBullets.map((b) => (
                          <li key={b} className="flex items-start gap-2 text-sm text-n600">
                            <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-petrol" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol">
                      Learn more <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </Card>
              </Reveal>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {rest.map((card) => {
            const href = `/services/${card.service.slug}/`;
            const body = card.overrideBody ?? card.service.intro;
            return (
              <Reveal key={href}>
                <Card className="h-full bg-white">
                  <Link href={href} className="flex h-full flex-col">
                    <h3 className="text-lg font-semibold text-ink">{card.service.h1}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-n700">{body}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol">
                      Learn more <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </Card>
              </Reveal>
            );
          })}
        </div>
      )}
    </Section>
  );
}
