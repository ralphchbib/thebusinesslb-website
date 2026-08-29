import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getMemberInstitutionMemberships } from "@/lib/network/institution";
import { RequestToJoinForm } from "@/components/network/institution/request-to-join-form";
import { RespondMembershipButtons } from "@/components/network/institution/respond-membership-buttons";
import { EndMembershipButton } from "@/components/network/institution/end-membership-button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Institutions" };

/**
 * Phase 18A — the member-side counterpart to `/dashboard/institution/
 * members`: a business or professional account's own view of its
 * institution memberships (PHASE18-TECHNICAL-DESIGN.md §C/§F). Business
 * and Professional accounts both see this — nothing in Blueprint §4.5 or
 * the access-control model restricts institution membership to one
 * account type, matching the reasoning `/dashboard/saved`, `/dashboard/
 * connections`, etc. already use for "any account type" nav items.
 */
export default async function MemberInstitutionsPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");
  if (user.accountType !== "business" && user.accountType !== "professional") redirect("/dashboard");

  const memberships = await getMemberInstitutionMemberships(user.id);
  const active = memberships.filter((m) => m.status === "active");
  const pendingIncoming = memberships.filter((m) => m.status === "pending" && !m.requestedByViewer);
  const pendingSent = memberships.filter((m) => m.status === "pending" && m.requestedByViewer);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Institutions</h1>
        <p className="mt-1 text-[13px] text-n500">Blueprint §4.5 — chambers, universities, associations and NGOs you belong to.</p>
      </div>

      <RequestToJoinForm />

      {pendingIncoming.length > 0 && (
        <div className="rounded-lg border border-n200 bg-white p-6">
          <h2 className="text-[15px] font-semibold text-ink">Invitations ({pendingIncoming.length})</h2>
          <div className="mt-4 flex flex-col gap-3">
            {pendingIncoming.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border border-n200 p-3">
                <p className="text-[13px] font-medium text-ink">{m.counterpart.name}</p>
                <RespondMembershipButtons membershipId={m.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingSent.length > 0 && (
        <div className="rounded-lg border border-n200 bg-white p-6">
          <h2 className="text-[15px] font-semibold text-ink">Requests sent ({pendingSent.length})</h2>
          <div className="mt-4 flex flex-col gap-3">
            {pendingSent.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border border-n200 p-3">
                <p className="text-[13px] font-medium text-ink">{m.counterpart.name}</p>
                <Badge variant="brass">Awaiting response</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-n200 bg-white p-6">
        <h2 className="text-[15px] font-semibold text-ink">My institutions ({active.length})</h2>
        {active.length === 0 ? (
          <p className="mt-3 text-[13px] text-n500">Not a member of any institution yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {active.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border border-n200 p-3">
                <div>
                  <p className="text-[13px] font-medium text-ink">{m.counterpart.name}</p>
                  {m.role && <p className="text-[12px] text-n500">{m.role}</p>}
                </div>
                <EndMembershipButton membershipId={m.id} label="Leave" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
