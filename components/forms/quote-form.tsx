"use client";

import * as React from "react";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { submitQuoteAction, type FormState } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { serviceInterestOptions, budgetOptions, timelineOptions } from "@/lib/validation/schemas";
import { quote } from "@/content/quote";

const initialState: FormState = { status: "idle" };

export function QuoteForm() {
  const [state, formAction, pending] = useActionState(submitQuoteAction, initialState);
  const pathname = usePathname();
  const [startedAt] = React.useState(() => Date.now());

  // Phase 7 attribution capture — reads UTM params + referrer once on
  // mount (both are browser-only; reading them at render time would
  // mismatch SSR). See PHASE7-ARCHITECTURE-REVIEW.md §1.3 for why this was
  // missing on every existing form before this phase — only landing_path
  // was ever wired up.
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

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="landing_path" value={pathname || ""} />
      <input type="hidden" name="form_started_at" value={startedAt} />
      <input type="hidden" name="utm_source" value={attribution.utmSource} />
      <input type="hidden" name="utm_medium" value={attribution.utmMedium} />
      <input type="hidden" name="utm_campaign" value={attribution.utmCampaign} />
      <input type="hidden" name="referrer_url" value={attribution.referrerUrl} />
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Your name" htmlFor="fullName" error={state.fieldErrors?.fullName}>
          <Input id="fullName" name="fullName" required autoComplete="name" hasError={!!state.fieldErrors?.fullName} />
        </FormField>
        <FormField label="Business name" htmlFor="businessName" optional error={state.fieldErrors?.businessName}>
          <Input id="businessName" name="businessName" autoComplete="organization" />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Email" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" required autoComplete="email" hasError={!!state.fieldErrors?.email} />
        </FormField>
        <FormField label="WhatsApp number" htmlFor="whatsapp" optional error={state.fieldErrors?.whatsapp}>
          <Input id="whatsapp" name="whatsapp" type="tel" autoComplete="tel" />
        </FormField>
      </div>

      <FormField label="What do you need a quote for?" htmlFor="interest" error={state.fieldErrors?.interest}>
        <Select id="interest" name="interest" required defaultValue="">
          <option value="" disabled>
            Choose one
          </option>
          {serviceInterestOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Describe the project"
        htmlFor="projectDescription"
        error={state.fieldErrors?.projectDescription}
        helper="Enough detail to actually price it — what you need, for whom, and any must-haves."
      >
        <Textarea
          id="projectDescription"
          name="projectDescription"
          required
          hasError={!!state.fieldErrors?.projectDescription}
          data-clarity-mask="true"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Budget range" htmlFor="budget" error={state.fieldErrors?.budget}>
          <Select id="budget" name="budget" required defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            {budgetOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Timeline" htmlFor="timeline" error={state.fieldErrors?.timeline}>
          <Select id="timeline" name="timeline" required defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            {timelineOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <p className="text-[13px] text-error">{state.message}</p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending…" : quote.form.submit}
      </Button>
      <p className="text-[13px] text-n500">{quote.form.micro}</p>
    </form>
  );
}
