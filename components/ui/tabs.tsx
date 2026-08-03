"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  className,
}: {
  tabs: { label: string; content: React.ReactNode }[];
  className?: string;
}) {
  const [active, setActive] = React.useState(0);
  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-6 border-b border-n200" role="tablist">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            role="tab"
            type="button"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={cn(
              "-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors",
              active === i ? "border-petrol text-ink" : "border-transparent text-n500",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-6">{tabs[active]?.content}</div>
    </div>
  );
}
