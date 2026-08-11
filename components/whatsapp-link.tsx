"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { whatsappLink } from "@/lib/config";
import { track } from "@/lib/analytics/track";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WhatsAppLink({
  pageName,
  position = "inline",
  children,
  className,
  variant = "secondary",
  size = "md",
}: {
  pageName: string;
  position?: string;
  children: React.ReactNode;
  className?: string;
} & Pick<ButtonProps, "variant" | "size">) {
  const pathname = usePathname();
  return (
    <Button asChild variant={variant} size={size} className={cn(className)}>
      <a
        href={whatsappLink(pageName)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("whatsapp_click", { path: pathname, position })}
      >
        {children}
      </a>
    </Button>
  );
}

/**
 * Phase 8 — unstyled counterpart for WhatsApp CTAs that aren't Button-shaped
 * (e.g. Footer's plain text link row). Same tracking, no forced Button
 * classes, so callers keep their own styling via `className`.
 */
export function WhatsAppTextLink({
  pageName,
  position = "inline",
  children,
  className,
}: {
  pageName: string;
  position?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <a
      href={whatsappLink(pageName)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => track("whatsapp_click", { path: pathname, position })}
    >
      {children}
    </a>
  );
}
