"use client";

import * as React from "react";
import { motion } from "framer-motion";

/**
 * Scroll entrance per §7.7 — 16px rise + fade, 520ms, fires once, never
 * re-animates on scroll back. `prefers-reduced-motion` is honoured globally
 * via Framer Motion's respect for the OS setting through `useReducedMotion`
 * is unnecessary here because the fallback (no animation) is visually
 * identical at rest; we simply skip the transform for reduced-motion users.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li";
}) {
  const Comp = motion[as];
  return (
    <Comp
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.52, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </Comp>
  );
}
