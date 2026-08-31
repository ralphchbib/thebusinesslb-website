import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getInstitutionAnalytics } from "@/lib/network/institution";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Institution" };

/**
 * Phase 18A — Institution Analytics (PHASE18-TECHNICAL-DESIGN.md §F/§G): a
 * direct, unsuppressed read of the institution's own membership rows.
 * Deliberately distinct from `/network/market-pulse`'s institutional tier
 * (Network-wide, k-anonymity-suppressed, cross-account data) — this page
 * shows one institution its own relationships, the same way `/dashboard/
 * leads` shows a business its own pipeline without suppression.
 */
export default async function InstitutionDashboardPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");
  if (user.accountType !== "institution") redirect("/dashboard");

  const analytics = await getInstitutionAnalytics(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Institution</h1>
        <p className="mt-1 text-[13px] text-n500">
          Blueprint §4.5 — build a member directory and see how it&rsquo;s grown.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-[13px] text-n600">
          <span>
            Active members: <strong className="text-ink">{analytics.activeCount}</strong>
          </span>
          <span>
            Pending requests: <strong className="text-ink">{analytics.pendingCount}</strong>
          </span>
          <span>
            Ended: <strong className="text-ink">{analytics.endedCount}</strong>
          </span>
        </div>
        <div className="mt-4">
          <Link href="/dashboard/institution/members" className="text-[13px] font-medium text-petrol underline">
            Manage members
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-6">
        <h2 className="text-[15px] font-semibold text-ink">Members by category</h2>
        {analytics.byCategory.length === 0 ? (
          <p className="mt-3 text-[13px] text-n500">No active members yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {analytics.byCategory.map((row) => (
              <li key={row.label} className="flex items-center justify-between text-[13px]">
                <span className="text-n700">{row.label}</span>
                <Badge variant="neutral">{row.count}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-n200 bg-white p-6">
        <h2 className="text-[15px] font-semibold text-ink">Membership growth</h2>
        {analytics.membershipsByMonth.length === 0 ? (
          <p className="mt-3 text-[13px] text-n500">No memberships activated yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {analytics.membershipsByMonth.map((row) => (
              <li key={row.month} className="flex items-center justify-between text-[13px]">
                <span className="text-n700">{row.month}</span>
                <Badge variant="petrol">{row.count}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
