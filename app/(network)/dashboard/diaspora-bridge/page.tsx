import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getOwnDeclaration } from "@/lib/network/diaspora";
import { DeclarationForm } from "@/components/network/declaration-form";

export const metadata: Metadata = { title: "Diaspora Bridge" };

const ELIGIBLE_TYPES = new Set(["business", "professional", "diaspora"]);

/**
 * Blueprint §33 — "My Declaration": create/edit/withdraw the account's own
 * standing declaration (PHASE18B-TECHNICAL-DESIGN.md §C). Institution and
 * consumer accounts are redirected — they aren't eligible to declare
 * (`payload/diaspora-eligibility.ts` enforces this server-side regardless;
 * this is the same convenience-gate-not-enforcement relationship every
 * other account-type-scoped dashboard route in this codebase already
 * follows, e.g. `/dashboard/leads`).
 */
export default async function DiasporaBridgeDashboardPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");
  if (!ELIGIBLE_TYPES.has(user.accountType)) redirect("/dashboard");

  const existing = await getOwnDeclaration(user.id);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Diaspora Bridge</h1>
      <p className="mt-2 text-[14px] text-n600">
        Your standing declaration — visible to anyone browsing the{" "}
        <Link href="/network/diaspora-bridge" className="font-semibold text-petrol">
          Diaspora Bridge Directory
        </Link>
        .
      </p>

      <div className="mt-6">
        <DeclarationForm
          accountType={user.accountType}
          existing={existing ? { id: existing.id, declarations: existing.declarations, note: existing.note } : null}
        />
      </div>
    </div>
  );
}
