"use client";

import * as React from "react";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { submitAssessmentAction, type FormState } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipOption } from "@/components/ui/chip";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/track";
import {
  sectorOptions,
  budgetOptions,
  contactPrefOptions,
} from "@/lib/validation/schemas";
import { assessment } from "@/content/assessment";

const initialState: FormState = { status: "idle" };
const STORAGE_KEY = "tb-assessment-draft";

type Draft = Record<string, string>;

export function AssessmentForm() {
  const [state, formAction, pending] = useActionState(submitAssessmentAction, initialState);
  const pathname = usePathname();
  const formRef = React.useRef<HTMLFormElement>(null);

  // Progressive enhancement: SSR / no-JS renders every field in one page.
  // Once mounted, the same form is presented as a two-step wizard.
  const [enhanced, setEnhanced] = React.useState(false);
  const [step, setStep] = React.useState<1 | 2>(1);
  const [draft, setDraft] = React.useState<Draft>({});
  const [startedAt] = React.useState(() => Date.now());
  const trackedStart = React.useRef(false);

  // Phase 7 attribution capture — see PHASE7-ARCHITECTURE-REVIEW.md §1.3:
  // only landing_path was ever wired up before this phase.
  const [attribution, setAttribution] = React.useState({
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    referrerUrl: "",
  });

  React.useEffect(() => {
    setEnhanced(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setDraft(JSON.parse(saved));
    } catch {
      /* ignore */
    }
    const params = new URLSearchParams(window.location.search);
    setAttribution({
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      referrerUrl: document.referrer || "",
    });
  }, []);

  function persist(name: string, value: string) {
    setDraft((prev) => {
      const next = { ...prev, [name]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    if (!trackedStart.current) {
      trackedStart.current = true;
      track("assessment_form_start", { path: pathname || "/digital-assessment/" });
    }
  }

  function goToStep2() {
    const form = formRef.current;
    if (!form) return;
    const step1Fields = ["fullName", "businessName", "sector"];
    for (const name of step1Fields) {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
      if (el && !el.reportValidity()) return;
    }
    track("assessment_form_step2", { path: pathname || "/digital-assessment/" });
    setStep(2);
  }

  React.useEffect(() => {
    if (state.status === "success") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [state.status]);

  const showStep1 = !enhanced || step === 1;
  const showStep2 = !enhanced || step === 2;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
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

      {enhanced && (
        <div className="flex items-center gap-2 text-xs font-medium text-n500">
          <span className={step === 1 ? "text-petrol" : ""}>Step 1 of 2</span>
          <div className="h-1 flex-1 rounded-pill bg-n200">
            <div
              className="h-1 rounded-pill bg-petrol transition-all duration-300"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>
          <span className={step === 2 ? "text-petrol" : ""}>Step 2 of 2</span>
        </div>
      )}

      <div className={showStep1 ? "flex flex-col gap-5" : "hidden"}>
        <FormField label="Your name" htmlFor="fullName" error={state.fieldErrors?.fullName}>
          <Input
            id="fullName"
            name="fullName"
            required
            defaultValue={draft.fullName}
            onChange={(e) => persist("fullName", e.target.value)}
            hasError={!!state.fieldErrors?.fullName}
          />
        </FormField>
        <FormField label="Business name" htmlFor="businessName" error={state.fieldErrors?.businessName}>
          <Input
            id="businessName"
            name="businessName"
            required
            defaultValue={draft.businessName}
            onChange={(e) => persist("businessName", e.target.value)}
            hasError={!!state.fieldErrors?.businessName}
          />
        </FormField>
        <FormField label="Sector" htmlFor="sector" error={state.fieldErrors?.sector}>
          <Select
            id="sector"
            name="sector"
            required
            defaultValue={draft.sector || ""}
            onChange={(e) => persist("sector", e.target.value)}
          >
            <option value="" disabled>
              Choose the closest sector
            </option>
            {sectorOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Website" htmlFor="websiteUrl" optional helper='Enter "none" if you don&rsquo;t have one'>
          <Input
            id="websiteUrl"
            name="websiteUrl"
            defaultValue={draft.websiteUrl}
            onChange={(e) => persist("websiteUrl", e.target.value)}
          />
        </FormField>
        <FormField label="Instagram or other social profile" htmlFor="instagramHandle" optional>
          <Input
            id="instagramHandle"
            name="instagramHandle"
            defaultValue={draft.instagramHandle}
            onChange={(e) => persist("instagramHandle", e.target.value)}
          />
        </FormField>

        {enhanced && (
          <Button type="button" size="lg" onClick={goToStep2} className="w-full sm:w-auto">
            Continue
          </Button>
        )}
      </div>

      <div className={showStep2 ? "flex flex-col gap-5" : "hidden"}>
        <FormField label="Roughly how many people work in the business?" htmlFor="teamSize" optional>
          <Input
            id="teamSize"
            name="teamSize"
            defaultValue={draft.teamSize}
            onChange={(e) => persist("teamSize", e.target.value)}
          />
        </FormField>
        <FormField
          label="What's the biggest thing holding your business back right now?"
          htmlFor="biggestBlocker"
          error={state.fieldErrors?.biggestBlocker}
        >
          <Textarea
            id="biggestBlocker"
            name="biggestBlocker"
            required
            defaultValue={draft.biggestBlocker}
            onChange={(e) => persist("biggestBlocker", e.target.value)}
            hasError={!!state.fieldErrors?.biggestBlocker}
          />
        </FormField>
        <FormField label="What would you like to be true in 90 days?" htmlFor="ninetyDayGoal" optional>
          <Textarea
            id="ninetyDayGoal"
            name="ninetyDayGoal"
            defaultValue={draft.ninetyDayGoal}
            onChange={(e) => persist("ninetyDayGoal", e.target.value)}
          />
        </FormField>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">
            Budget range you&rsquo;d consider investing
            <span className="ml-1.5 font-normal text-n500">(helps us recommend the right scope)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {budgetOptions.map((opt) => (
              <ChipOption
                key={opt.value}
                name="budget"
                value={opt.value}
                label={opt.label}
                required
                defaultChecked={draft.budget === opt.value}
                onChange={() => persist("budget", opt.value)}
              />
            ))}
          </div>
          {state.fieldErrors?.budget && (
            <p className="mt-1.5 text-[13px] text-error">{state.fieldErrors.budget}</p>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Best way to reach you</p>
          <div className="flex flex-wrap gap-2">
            {contactPrefOptions.map((opt) => (
              <ChipOption
                key={opt.value}
                name="contactPreference"
                value={opt.value}
                label={opt.label}
                required
                defaultChecked={draft.contactPreference === opt.value}
                onChange={() => persist("contactPreference", opt.value)}
              />
            ))}
          </div>
          {state.fieldErrors?.contactPreference && (
            <p className="mt-1.5 text-[13px] text-error">{state.fieldErrors.contactPreference}</p>
          )}
        </div>

        <label className="flex items-start gap-3 text-sm text-n700">
          <Checkbox name="consentContact" required className="mt-0.5" />
          {assessment.form.consent}
        </label>
        {state.fieldErrors?.consentContact && (
          <p className="text-[13px] text-error">{state.fieldErrors.consentContact}</p>
        )}

        {state.status === "error" && !state.fieldErrors && (
          <p className="text-[13px] text-error">{state.message}</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          {enhanced && (
            <Button type="button" variant="secondary" size="lg" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          <Button type="submit" size="lg" disabled={pending} className="flex-1">
            {pending ? "Sending…" : assessment.form.submit}
          </Button>
        </div>
        <p className="text-[13px] text-n500">{assessment.form.micro}</p>
      </div>
    </form>
  );
}
