import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getInstitutionMemberships } from "@/lib/network/institution";
import { InviteMemberForm } from "@/components/network/institution/invite-member-form";
import { RespondMembershipButtons } from "@/components/network/institution/respond-membership-buttons";
import { EndMembershipButton } from "@/components/network/institution/end-membership-button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Institution Members" };

/**
 * Phase 18A — Institution Member Directory + Membership Requests +
 * Approval Workflow (PHASE18-TECHNICAL-DESIGN.md §C/§F), all on one page —
 * the same "multiple sections under one dashboard area" shape `/dashboard/
 * leads` already established (pipeline + Contacts + Follow-up tasks as
 * separate concerns on adjacent surfaces, not four unrelated pages).
 */
export default async function InstitutionMembersPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");
  if (user.accountType !== "institution") redirect("/dashboard");

  const memberships = await getInstitutionMemberships(user.id);
  const active = memberships.filter((m) => m.status === "active");
  const pendingIncoming = memberships.filter((m) => m.status === "pending" && !m.requestedByViewer);
  const pendingSent = memberships.filter((m) => m.status === "pending" && m.requestedByViewer);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Members</h1>
        <p className="mt-1 text-[13px] text-n500">Invite businesses and professionals, and approve requests to join.</p>
      </div>

      <InviteMemberForm />

      {pendingIncoming.length > 0 && (
        <div className="rounded-lg border border-n200 bg-white p-6">
          <h2 className="text-[15px] font-semibold text-ink">Requests to join ({pendingIncoming.length})</h2>
          <div className="mt-4 flex flex-col gap-3">
            {pendingIncoming.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border border-n200 p-3">
                <div>
                  <p className="text-[13px] font-medium text-ink">{m.counterpart.name}</p>
                  <p className="text-[12px] capitalize text-n500">{m.counterpart.accountType}</p>
                </div>
                <RespondMembershipButtons membershipId={m.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingSent.length > 0 && (
        <div className="rounded-lg border border-n200 bg-white p-6">
          <h2 className="text-[15px] font-semibold text-ink">Invitations sent ({pendingSent.length})</h2>
          <div className="mt-4 flex flex-col gap-3">
            {pendingSent.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border border-n200 p-3">
                <div>
                  <p className="text-[13px] font-medium text-ink">{m.counterpart.name}</p>
                  <p className="text-[12px] capitalize text-n500">{m.counterpart.accountType}</p>
                </div>
                <Badge variant="brass">Awaiting response</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-n200 bg-white p-6">
        <h2 className="text-[15px] font-semibold text-ink">Active members ({active.length})</h2>
        {active.length === 0 ? (
          <p className="mt-3 text-[13px] text-n500">No members yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {active.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border border-n200 p-3">
                <div>
                  <p className="text-[13px] font-medium text-ink">{m.counterpart.name}</p>
                  <p className="text-[12px] text-n500">
                    <span className="capitalize">{m.counterpart.accountType}</span>
                    {m.role && <> · {m.role}</>}
                  </p>
                </div>
                <EndMembershipButton membershipId={m.id} label="Remove" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
