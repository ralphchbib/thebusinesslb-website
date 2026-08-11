"use client";

import * as React from "react";
import Script from "next/script";
import { CONSENT_CHANGE_EVENT, getStoredConsent } from "@/lib/consent";

/**
 * Phase 8 — only mounts gtag.js once consent is "granted". Reads consent
 * on mount and again on CONSENT_CHANGE_EVENT so accepting the banner loads
 * the script immediately, without a page reload.
 */
export function GA4Script({ gaId }: { gaId: string }) {
  const [granted, setGranted] = React.useState(false);

  React.useEffect(() => {
    setGranted(getStoredConsent() === "granted");
    function onChange(e: Event) {
      setGranted((e as CustomEvent<string>).detail === "granted");
    }
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  }, []);

  if (!granted) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
