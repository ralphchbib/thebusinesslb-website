import { Check } from "lucide-react";
import { Section } from "./section";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";

export interface ProblemBlockProps {
  eyebrow?: string;
  title: string;
  body1: string;
  body2: string;
  quote: string;
  symptoms: string[];
}

export function ProblemBlock({ eyebrow, title, body1, body2, quote, symptoms }: ProblemBlockProps) {
  return (
    <Section surface="white">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[6fr_4fr] lg:gap-16">
        <Reveal>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 className="font-display mt-3.5 text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {title}
          </h2>
          <p className="measure mt-6 text-[17px] leading-relaxed text-n700">{body1}</p>
          <p className="measure mt-4 text-[17px] leading-relaxed text-n700">{body2}</p>
          <p className="font-display measure-lead mt-6 text-xl italic leading-relaxed text-ink">
            &ldquo;{quote}&rdquo;
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <ul className="flex flex-col gap-3 rounded-lg border border-n200 bg-mist p-6">
            {symptoms.map((symptom) => (
              <li key={symptom} className="flex items-start gap-3 text-[15px] text-n700">
                <Check className="mt-0.5 h-4 w-4 flex-none text-petrol" />
                {symptom}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
