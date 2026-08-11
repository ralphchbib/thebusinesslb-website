"use client";

import * as React from "react";
import Script from "next/script";
import { CONSENT_CHANGE_EVENT, getStoredConsent } from "@/lib/consent";

/**
 * Phase 8 — same consent-gating mechanism as GA4Script. lazyOnload per the
 * Risk Assessment: session-replay recording isn't needed for first paint.
 */
export function ClarityScript({ clarityId }: { clarityId: string }) {
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
    <Script id="clarity-init" strategy="lazyOnload">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${clarityId}");
      `}
    </Script>
  );
}
