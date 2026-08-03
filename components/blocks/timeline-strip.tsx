import { Section } from "./section";
import { Reveal } from "@/components/motion/reveal";
import type { ServiceTimelineStep } from "@/content/services/types";

export function TimelineStrip({ steps }: { steps: ServiceTimelineStep[] }) {
  return (
    <Section surface="white">
      <p className="eyebrow mb-6">
        <span className="tb-rule tb-rule--petrol" />
        Timeline
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:gap-3">
        {steps.map((step) => (
          <Reveal key={step.label} className="lg:flex-1">
            <div className="h-full rounded-lg border border-n200 bg-mist p-5">
              <p className="text-xs font-semibold text-petrol">{step.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
