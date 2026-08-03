import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

/**
 * A native <select>, deliberately — it works with JavaScript disabled and is
 * the fastest input pattern on a phone, per §7.5 of the build spec.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex h-[46px] w-full appearance-none rounded-[6px] border bg-white px-3.5 pr-9 text-base text-ink disabled:cursor-not-allowed disabled:opacity-50",
            hasError ? "border-error" : "border-n300",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-n500" />
      </div>
    );
  },
);
Select.displayName = "Select";

export { Select };
