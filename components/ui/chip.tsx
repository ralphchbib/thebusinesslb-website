import * as React from "react";
import { cn } from "@/lib/utils";

export interface ChipOptionProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/**
 * A radio/checkbox rendered as a pill — native inputs underneath so the
 * group still works with JavaScript disabled (§7.5: chips for budget and
 * sector, faster on a phone than a dropdown).
 */
export const ChipOption = React.forwardRef<HTMLInputElement, ChipOptionProps>(
  ({ label, className, type = "radio", ...props }, ref) => {
    return (
      <label
        className={cn(
          "group relative flex cursor-pointer items-center justify-center rounded-pill border border-n300 bg-white px-4 py-2 text-sm font-medium text-ink transition-colors has-[:checked]:border-petrol has-[:checked]:bg-petrol has-[:checked]:text-white",
          className,
        )}
      >
        <input
          ref={ref}
          type={type}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
          {...props}
        />
        {label}
      </label>
    );
  },
);
ChipOption.displayName = "ChipOption";
