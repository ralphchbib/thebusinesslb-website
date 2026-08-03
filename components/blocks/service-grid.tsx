import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Section } from "./section";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";
import { services } from "@/content/home";

export function ServiceGrid() {
  const [engine1, engine2, ...rest] = services.cards;

  return (
    <Section surface="mist">
      <Reveal>
        <Eyebrow>{services.eyebrow}</Eyebrow>
        <h2 className="font-display mt-3.5 text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          {services.h2}
        </h2>
        <p className="measure-lead mt-4 text-[17px] leading-relaxed text-n700">{services.intro}</p>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        {[engine1, engine2].map((card) => (
          <Reveal key={card.href}>
            <Card ruleColor="petrol" className="h-full bg-white">
              <Link href={card.href} className="flex h-full flex-col">
                {card.eyebrow && <p className="eyebrow mb-3">{card.eyebrow}</p>}
                <h3 className="text-xl font-semibold text-ink">{card.name}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-n700">{card.body}</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {card.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-n600">
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-petrol" />
                      {b}
                    </li>
                  ))}
                </ul>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol">
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </Card>
          </Reveal>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {rest.map((card) => (
          <Reveal key={card.href}>
            <Card className="h-full bg-white">
              <Link href={card.href} className="flex h-full flex-col">
                <h3 className="text-lg font-semibold text-ink">{card.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-n700">{card.body}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol">
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
