"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getStoredConsent, setStoredConsent } from "@/lib/consent";

/**
 * Phase 8 — shown until the visitor makes an explicit choice; hidden
 * permanently (via localStorage) once they do. See lib/consent.ts for why
 * this is a plain localStorage flag rather than a cookie.
 */
export function ConsentBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    setVisible(getStoredConsent() === "unset");
  }, []);

  function choose(value: "granted" | "denied") {
    setStoredConsent(value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-n200 bg-white px-6 py-5 shadow-tb-2 sm:px-10"
    >
      <div className="mx-auto flex max-w-content flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-relaxed text-n700">
          We use analytics cookies (Google Analytics, Microsoft Clarity) to understand how visitors use this
          site. Nothing is tracked unless you accept. See our{" "}
          <Link href="/privacy-policy/" className="font-semibold text-petrol underline">
            privacy policy
          </Link>
          .
        </p>
        <div className="flex flex-none gap-3">
          <Button variant="secondary" size="sm" onClick={() => choose("denied")}>
            Decline
          </Button>
          <Button variant="primary" size="sm" onClick={() => choose("granted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
