"use client";

import { useActionState } from "react";
import { saveBusinessProfileAction, type ProfileFormState } from "@/lib/network/profile-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { LANGUAGE_OPTIONS } from "@/payload/language-options";

const initialState: ProfileFormState = { status: "idle" };

export function BusinessProfileForm({
  defaultValues,
}: {
  defaultValues?: {
    companyName?: string;
    slug?: string;
    description?: string;
    industry?: string;
    category?: string;
    location?: string;
    languages?: string[];
    contactEmail?: string;
    contactPhone?: string;
    servicesText?: string;
    socialLinksText?: string;
    logoUrl?: string;
  };
}) {
  const [state, formAction, pending] = useActionState(saveBusinessProfileAction, initialState);

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-5">
      <FormField label="Company name" htmlFor="companyName" error={state.fieldErrors?.companyName}>
        <Input id="companyName" name="companyName" required defaultValue={defaultValues?.companyName} />
      </FormField>

      <FormField label="Slug" htmlFor="slug" error={state.fieldErrors?.slug} helper="Your public URL: /network/businesses/{slug}">
        <Input id="slug" name="slug" required defaultValue={defaultValues?.slug} />
      </FormField>

      <FormField label="Description" htmlFor="description" error={state.fieldErrors?.description}>
        <Textarea id="description" name="description" required defaultValue={defaultValues?.description} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Industry" htmlFor="industry" optional>
          <Input id="industry" name="industry" defaultValue={defaultValues?.industry} />
        </FormField>
        <FormField label="Category" htmlFor="category" optional helper="More specific than industry.">
          <Input id="category" name="category" defaultValue={defaultValues?.category} />
        </FormField>
      </div>

      <FormField label="Location" htmlFor="location" optional>
        <Input id="location" name="location" defaultValue={defaultValues?.location} />
      </FormField>

      <FormField label="Languages" htmlFor="languages" optional>
        <div className="flex flex-wrap gap-4">
          {LANGUAGE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-[14px] text-ink">
              <input
                type="checkbox"
                name="languages"
                value={opt.value}
                defaultChecked={defaultValues?.languages?.includes(opt.value)}
                className="h-4 w-4 accent-petrol"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Contact email" htmlFor="contactEmail" optional error={state.fieldErrors?.contactEmail}>
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={defaultValues?.contactEmail} />
        </FormField>
        <FormField label="Contact phone" htmlFor="contactPhone" optional>
          <Input id="contactPhone" name="contactPhone" defaultValue={defaultValues?.contactPhone} />
        </FormField>
      </div>

      <FormField label="Logo" htmlFor="logo" optional helper={defaultValues?.logoUrl ? "Replacing will overwrite the current logo." : undefined}>
        <input id="logo" name="logo" type="file" accept="image/*" className="text-sm" />
      </FormField>

      <FormField
        label="Services"
        htmlFor="servicesText"
        optional
        helper='One per line, as "Name: Description".'
      >
        <Textarea id="servicesText" name="servicesText" defaultValue={defaultValues?.servicesText} rows={4} />
      </FormField>

      <FormField
        label="Social links"
        htmlFor="socialLinksText"
        optional
        helper='One per line, as "Label: URL".'
      >
        <Textarea id="socialLinksText" name="socialLinksText" defaultValue={defaultValues?.socialLinksText} rows={3} />
      </FormField>

      {state.status === "error" && !state.fieldErrors && <p className="text-[13px] text-error">{state.message}</p>}
      {state.status === "success" && <p className="text-[13px] text-petrol">{state.message}</p>}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
