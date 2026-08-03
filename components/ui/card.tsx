import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared card skeleton per §7.6 — 1px border, 16px radius, signature rule on
 * the top edge, lift + shadow on hover.
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; ruleColor?: "ink" | "petrol" | "brass" }
>(({ className, interactive = true, ruleColor = "ink", children, ...props }, ref) => {
  const ruleClass =
    ruleColor === "petrol" ? "bg-petrol" : ruleColor === "brass" ? "bg-brass" : "bg-ink";
  return (
    <div
      ref={ref}
      className={cn(
        "group relative flex flex-col rounded-lg border border-n200 bg-white p-6 md:p-8",
        interactive &&
          "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-[3px] hover:shadow-tb-3",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute left-0 top-0 h-[2px] w-7 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full",
          ruleClass,
        )}
      />
      {children}
    </div>
  );
});
Card.displayName = "Card";

export { Card };
