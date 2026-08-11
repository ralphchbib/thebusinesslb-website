"use client";

import * as React from "react";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { subscribeNewsletterAction, type FormState } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { newsletter as newsletterDefaults } from "@/content/site";
import { track } from "@/lib/analytics/track";

const initialState: FormState = { status: "idle" };

export function NewsletterForm({
  dark = true,
  heading,
  sub,
  consent,
}: {
  dark?: boolean;
  /** Defaults to the static copy in content/site.ts if not passed — callers
   *  that fetch Site Settings from the CMS should pass these explicitly. */
  heading?: string;
  sub?: string;
  consent?: string;
}) {
  const [state, formAction, pending] = useActionState(subscribeNewsletterAction, initialState);
  const pathname = usePathname();

  // Phase 7 attribution capture — see PHASE7-ARCHITECTURE-REVIEW.md §1.3:
  // only landing_path was ever wired up before this phase.
  const [attribution, setAttribution] = React.useState({
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    referrerUrl: "",
  });
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAttribution({
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      referrerUrl: document.referrer || "",
    });
  }, []);

  const newsletter = {
    heading: heading ?? newsletterDefaults.heading,
    sub: sub ?? newsletterDefaults.sub,
    consent: consent ?? newsletterDefaults.consent,
  };

  React.useEffect(() => {
    if (state.status === "success") {
      track("newsletter_subscribe", { path: pathname || "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  if (state.status === "success") {
    return (
      <p className={dark ? "text-sm text-white" : "text-sm text-ink"}>
        You&rsquo;re subscribed. First email arrives within two weeks.
      </p>
    );
  }

  return (
    <form action={formAction} className="w-full">
      <input type="hidden" name="landing_path" value={pathname || ""} />
      <input type="hidden" name="utm_source" value={attribution.utmSource} />
      <input type="hidden" name="utm_medium" value={attribution.utmMedium} />
      <input type="hidden" name="utm_campaign" value={attribution.utmCampaign} />
      <input type="hidden" name="referrer_url" value={attribution.referrerUrl} />
      {/* Phase 7 — honeypot added; this form previously had none, unlike
          Contact/Assessment. See PHASE7-ARCHITECTURE-REVIEW.md §1.4. */}
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <p className={dark ? "mb-1 text-[15px] font-semibold text-white" : "mb-1 text-[15px] font-semibold text-ink"}>
        {newsletter.heading}
      </p>
      <p className={dark ? "mb-4 text-sm text-white/60" : "mb-4 text-sm text-n500"}>{newsletter.sub}</p>
      <div className="flex max-w-sm gap-2">
        <Input
          type="email"
          name="email"
          placeholder="you@business.com"
          required
          hasError={!!state.fieldErrors?.email}
          className={dark ? "border-white/20 bg-white/5 text-white placeholder:text-white/40" : ""}
        />
        <Button type="submit" variant={dark ? "primary" : "primary"} disabled={pending}>
          {pending ? "Sending…" : "Subscribe"}
        </Button>
      </div>
      {state.status === "error" && (
        <p className="mt-2 text-[13px] text-error">{state.message}</p>
      )}
      <p className={dark ? "mt-2 text-[13px] text-white/65" : "mt-2 text-[13px] text-n400"}>
        {newsletter.consent}
      </p>
    </form>
  );
}
