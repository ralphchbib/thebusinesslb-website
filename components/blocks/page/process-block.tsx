import { Section } from "@/components/blocks/section";
import type { PayloadProcessBlockDoc } from "@/lib/cms/types";

/**
 * Phase 6B — field shape and card styling copied from Homepage's Process
 * section (components/blocks/process-block.tsx), already proven in
 * production. Covers both "Process" and "Timeline" from the Phase 6B
 * brief's block list. Renamed PageProcessBlock (not ProcessBlock) to
 * avoid a name collision with that Homepage component.
 */
export function PageProcessBlock({
  eyebrow,
  h2,
  steps,
}: Omit<PayloadProcessBlockDoc, "id" | "blockType" | "isVisible">) {
  return (
    <Section surface="white">
      {eyebrow && (
        <p className="eyebrow mb-3.5">
          <span className="tb-rule tb-rule--petrol" />
          {eyebrow}
        </p>
      )}
      {h2 && (
        <h2 className="font-display text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">{h2}</h2>
      )}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, i) => (
          <div key={step.id ?? i} className="h-full rounded-lg border border-n200 bg-white p-5">
            <p className="font-mono text-xs font-medium text-petrol">{step.number}</p>
            <p className="mt-2 text-[15px] font-semibold text-ink">{step.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-n600">{step.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
