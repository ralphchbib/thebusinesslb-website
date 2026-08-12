"use client";

import { useActionState } from "react";
import { saveProfessionalProfileAction, type ProfileFormState } from "@/lib/network/profile-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

const initialState: ProfileFormState = { status: "idle" };

export function ProfessionalProfileForm({
  defaultValues,
}: {
  defaultValues?: {
    name?: string;
    slug?: string;
    title?: string;
    bio?: string;
    contactEmail?: string;
    contactPhone?: string;
    skillsText?: string;
    experienceText?: string;
    servicesText?: string;
    photoUrl?: string;
  };
}) {
  const [state, formAction, pending] = useActionState(saveProfessionalProfileAction, initialState);

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-5">
      <FormField label="Name" htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" required defaultValue={defaultValues?.name} />
      </FormField>

      <FormField label="Slug" htmlFor="slug" error={state.fieldErrors?.slug} helper="Your public URL: /network/professionals/{slug}">
        <Input id="slug" name="slug" required defaultValue={defaultValues?.slug} />
      </FormField>

      <FormField label="Professional title" htmlFor="title" error={state.fieldErrors?.title}>
        <Input id="title" name="title" required defaultValue={defaultValues?.title} />
      </FormField>

      <FormField label="Bio" htmlFor="bio" error={state.fieldErrors?.bio}>
        <Textarea id="bio" name="bio" required defaultValue={defaultValues?.bio} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Contact email" htmlFor="contactEmail" optional error={state.fieldErrors?.contactEmail}>
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={defaultValues?.contactEmail} />
        </FormField>
        <FormField label="Contact phone" htmlFor="contactPhone" optional>
          <Input id="contactPhone" name="contactPhone" defaultValue={defaultValues?.contactPhone} />
        </FormField>
      </div>

      <FormField label="Photo" htmlFor="photo" optional helper={defaultValues?.photoUrl ? "Replacing will overwrite the current photo." : undefined}>
        <input id="photo" name="photo" type="file" accept="image/*" className="text-sm" />
      </FormField>

      <FormField label="Skills" htmlFor="skillsText" optional helper="Comma-separated.">
        <Input id="skillsText" name="skillsText" defaultValue={defaultValues?.skillsText} />
      </FormField>

      <FormField
        label="Experience"
        htmlFor="experienceText"
        optional
        helper='One per line, as "Role at Company — description".'
      >
        <Textarea id="experienceText" name="experienceText" defaultValue={defaultValues?.experienceText} rows={4} />
      </FormField>

      <FormField
        label="Services"
        htmlFor="servicesText"
        optional
        helper='One per line, as "Name: Description".'
      >
        <Textarea id="servicesText" name="servicesText" defaultValue={defaultValues?.servicesText} rows={4} />
      </FormField>

      {state.status === "error" && !state.fieldErrors && <p className="text-[13px] text-error">{state.message}</p>}
      {state.status === "success" && <p className="text-[13px] text-petrol">{state.message}</p>}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
