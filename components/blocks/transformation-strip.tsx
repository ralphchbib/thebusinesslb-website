"use client";

import * as React from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Section } from "./section";
import { Eyebrow } from "@/components/motion/eyebrow";
import { Reveal } from "@/components/motion/reveal";
import { transformation } from "@/content/home";

export function TransformationStrip() {
  const [showAll, setShowAll] = React.useState(false);
  const visibleMobile = showAll ? transformation.stages : transformation.stages.slice(0, 3);

  return (
    <Section surface="white">
      <Reveal>
        <Eyebrow>{transformation.eyebrow}</Eyebrow>
        <h2 className="font-display mt-3.5 max-w-3xl text-[26px] font-medium tracking-[-0.02em] text-ink md:text-[34px]">
          {transformation.h2}
        </h2>
        <p className="measure-lead mt-4 text-[17px] leading-relaxed text-n700">{transformation.intro}</p>
      </Reveal>

      {/* Desktop: horizontal strip */}
      <div className="mt-10 hidden lg:flex lg:items-stretch lg:gap-3">
        {transformation.stages.map((stage, i) => (
          <React.Fragment key={stage.stage}>
            <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-n200 bg-mist p-4">
              <p className="text-xs font-semibold text-petrol">{stage.stage}</p>
              <p className="mt-2 text-[13px] leading-snug text-n600">{stage.where}</p>
              <p className="mt-2 text-[13px] font-medium leading-snug text-ink">{stage.what}</p>
            </div>
            {i < transformation.stages.length - 1 && (
              <ArrowRight className="mt-8 h-4 w-4 flex-none self-start text-n400" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Mobile: vertical list */}
      <div className="mt-8 flex flex-col gap-3 lg:hidden">
        {visibleMobile.map((stage) => (
          <div key={stage.stage} className="rounded-lg border border-n200 bg-mist p-4">
            <p className="text-xs font-semibold text-petrol">{stage.stage}</p>
            <p className="mt-1.5 text-sm leading-snug text-n600">{stage.where}</p>
            <p className="mt-1.5 text-sm font-medium leading-snug text-ink">{stage.what}</p>
          </div>
        ))}
        {!showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-petrol"
          >
            Show all {transformation.stages.length} stages <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      <Reveal>
        <p className="font-display measure-lead mt-10 text-xl leading-relaxed text-ink">{transformation.close}</p>
      </Reveal>
    </Section>
  );
}
