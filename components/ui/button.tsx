import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-[15px] font-medium transition-all duration-[140ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:pointer-events-none disabled:bg-n200 disabled:text-n400 disabled:shadow-none",
  {
    variants: {
      variant: {
        primary:
          "bg-petrol text-white shadow-tb-1 hover:bg-petrol-deep hover:shadow-tb-2 hover:-translate-y-px active:translate-y-0 active:shadow-tb-1",
        ink: "bg-ink text-white shadow-tb-1 hover:bg-n900 hover:shadow-tb-2 hover:-translate-y-px active:translate-y-0",
        secondary:
          "bg-white text-ink border border-n300 hover:border-n400 hover:-translate-y-px",
        ghost: "bg-transparent text-petrol hover:bg-petrol-tint",
        danger: "bg-error text-white hover:brightness-95",
      },
      size: {
        lg: "h-13 px-7 text-base [height:52px]",
        md: "h-[46px] px-5",
        sm: "h-[34px] px-3.5 text-sm rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
