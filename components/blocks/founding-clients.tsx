import Link from "next/link";
import { Check } from "lucide-react";
import { Section } from "./section";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";
import { foundingClients } from "@/content/home";

export function FoundingClients() {
  return (
    <Section surface="veil">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[6fr_4fr] lg:gap-16">
        <Reveal>
          <Eyebrow>{foundingClients.eyebrow}</Eyebrow>
          <h2 className="font-display mt-3.5 text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {foundingClients.h2}
          </h2>
          <p className="measure mt-6 text-[17px] leading-relaxed text-n700">{foundingClients.body}</p>
        </Reveal>
        <Reveal delay={0.08}>
          <ul className="flex flex-col gap-3 rounded-lg border border-n200 bg-white p-6">
            {foundingClients.offer.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] text-n700">
                <Check className="mt-0.5 h-4 w-4 flex-none text-petrol" />
                {item}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
            <Link href="/digital-assessment/">{foundingClients.cta}</Link>
          </Button>
        </Reveal>
      </div>
    </Section>
  );
}
