import * as React from "react";
import { cn } from "@/lib/utils";

const surfaceClass = {
  white: "bg-white text-ink",
  mist: "bg-mist text-ink",
  veil: "bg-petrol-veil text-ink",
  ink: "bg-ink text-white",
};

export function Section({
  surface = "white",
  className,
  containerClassName,
  children,
  id,
}: {
  surface?: keyof typeof surfaceClass;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-16 md:py-24", surfaceClass[surface], className)}>
      <div className={cn("mx-auto max-w-content px-6 lg:px-10", containerClassName)}>{children}</div>
    </section>
  );
}
