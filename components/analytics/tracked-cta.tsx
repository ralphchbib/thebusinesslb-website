"use client";

import * as React from "react";
import Link from "next/link";
import { track } from "@/lib/analytics/track";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Phase 8 — the CTA-click-tracking counterpart to WhatsAppLink, for the
 * plain internal-link CTAs (Hero, Pricing, Services Grid) that don't go
 * through WhatsApp. Same Button asChild + onClick pattern.
 */
export function TrackedCta({
  href,
  ctaId,
  ctaLocation,
  children,
  className,
  variant = "primary",
  size = "md",
}: {
  href: string;
  ctaId: string;
  ctaLocation: string;
  children: React.ReactNode;
  className?: string;
} & Pick<ButtonProps, "variant" | "size">) {
  return (
    <Button asChild variant={variant} size={size} className={cn(className)}>
      <Link href={href} onClick={() => track("cta_click", { cta_id: ctaId, cta_location: ctaLocation })}>
        {children}
      </Link>
    </Button>
  );
}

/**
 * Unstyled counterpart for CTAs that aren't Button-shaped — e.g. a full
 * Card surface acting as the link, like Services Grid's card links.
 */
export function TrackedLink({
  href,
  ctaId,
  ctaLocation,
  children,
  className,
}: {
  href: string;
  ctaId: string;
  ctaLocation: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => track("cta_click", { cta_id: ctaId, cta_location: ctaLocation })}
    >
      {children}
    </Link>
  );
}
