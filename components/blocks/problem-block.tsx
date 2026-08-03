import { Check } from "lucide-react";
import { Section } from "./section";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";
import { problem } from "@/content/home";

export function ProblemBlock() {
  return (
    <Section surface="white">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[6fr_4fr] lg:gap-16">
        <Reveal>
          <Eyebrow>{problem.eyebrow}</Eyebrow>
          <h2 className="font-display mt-3.5 text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
            {problem.h2}
          </h2>
          <p className="measure mt-6 text-[17px] leading-relaxed text-n700">{problem.body1}</p>
          <p className="measure mt-4 text-[17px] leading-relaxed text-n700">{problem.body2}</p>
          <p className="font-display measure-lead mt-6 text-xl italic leading-relaxed text-ink">
            &ldquo;{problem.quote}&rdquo;
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <ul className="flex flex-col gap-3 rounded-lg border border-n200 bg-mist p-6">
            {problem.symptoms.map((symptom) => (
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
