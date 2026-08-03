import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[13px] font-medium",
  {
    variants: {
      variant: {
        petrol: "bg-petrol-tint text-petrol-deep",
        brass: "bg-brass-tint text-brass",
        neutral: "bg-n100 text-n700",
        ink: "bg-ink text-white",
      },
    },
    defaultVariants: { variant: "petrol" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
