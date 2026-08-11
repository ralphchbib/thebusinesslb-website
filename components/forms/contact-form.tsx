"use client";

import * as React from "react";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { submitContactAction, type FormState } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { serviceInterestOptions } from "@/lib/validation/schemas";
import { contact } from "@/content/contact";

const initialState: FormState = { status: "idle" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactAction, initialState);
  const pathname = usePathname();

  // Phase 7 attribution capture — see PHASE7-ARCHITECTURE-REVIEW.md §1.3:
  // only landing_path was ever wired up before this phase, even though
  // utm_source/utm_medium/utm_campaign/referrer_url have been read by
  // lib/actions.ts's readAttribution() and stored in the database this
  // whole time. Read once on mount (both are browser-only values; reading
  // them at render time would mismatch SSR).
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

      <FormField label="What are you interested in?" htmlFor="interest" error={state.fieldErrors?.interest}>
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
        label="Tell us about your business and what you're trying to solve"
        htmlFor="message"
        error={state.fieldErrors?.message}
      >
        <Textarea
          id="message"
          name="message"
          required
          hasError={!!state.fieldErrors?.message}
          data-clarity-mask="true"
        />
      </FormField>

      {state.status === "error" && !state.fieldErrors && (
        <p className="text-[13px] text-error">{state.message}</p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending…" : "Send my message"}
      </Button>
      <p className="text-[13px] text-n500">{contact.form.micro}</p>
    </form>
  );
}
