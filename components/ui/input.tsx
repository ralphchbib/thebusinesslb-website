import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-[46px] w-full rounded-[6px] border bg-white px-3.5 text-base text-ink placeholder:text-n400 disabled:cursor-not-allowed disabled:opacity-50",
          hasError ? "border-error" : "border-n300",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
