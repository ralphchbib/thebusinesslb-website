import { Section } from "./section";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";

export interface ProcessBlockProps {
  eyebrow?: string;
  title: string;
  steps: { number: string; name: string; body: string }[];
  trustPoints: { name: string; body: string }[];
}

export function ProcessBlock({ eyebrow, title, steps, trustPoints }: ProcessBlockProps) {
  return (
    <Section surface="white">
      <Reveal>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="font-display mt-3.5 text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          {title}
        </h2>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step) => (
          <Reveal key={step.number}>
            <div className="h-full rounded-lg border border-n200 bg-white p-5">
              <p className="font-mono text-xs font-medium text-petrol">{step.number}</p>
              <p className="mt-2 text-[15px] font-semibold text-ink">{step.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-n600">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {trustPoints.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((item) => (
            <Reveal key={item.name}>
              <div className="h-full rounded-lg bg-mist p-5">
                <p className="text-[15px] font-semibold text-ink">{item.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-n600">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </Section>
  );
}
