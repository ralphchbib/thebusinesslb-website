"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Eyebrow label with the signature rule drawing outward on scroll entry. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("eyebrow", className)}>
      <motion.span
        className="tb-rule tb-rule--petrol"
        initial={{ width: 28 }}
        whileInView={{ width: "100%" }}
        viewport={{ once: true }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 28 }}
      />
      {children}
    </span>
  );
}
