import * as React from "react";
import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { optional?: boolean }
>(({ className, children, optional, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("mb-2 block text-sm font-semibold text-ink", className)}
    {...props}
  >
    {children}
    {optional && <span className="ml-1.5 font-normal text-n500">(optional)</span>}
  </label>
));
Label.displayName = "Label";

export { Label };
