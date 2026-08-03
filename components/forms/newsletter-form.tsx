"use client";

import * as React from "react";
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { subscribeNewsletterAction, type FormState } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { newsletter } from "@/content/site";

const initialState: FormState = { status: "idle" };

export function NewsletterForm({ dark = true }: { dark?: boolean }) {
  const [state, formAction, pending] = useActionState(subscribeNewsletterAction, initialState);
  const pathname = usePathname();

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
