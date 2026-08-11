import type { Metadata } from "next";
import Link from "next/link";
import { getNetworkUser } from "@/lib/network/session";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Phase 9A ships the shell; Phase 9B adds the profile/portfolio editor
 * for business and professional accounts (linked below). Directory/
 * search/inbox are still later scope. The layout above already redirects
 * unauthenticated visitors before this ever renders, so `user` is
 * guaranteed non-null here.
 */
export default async function DashboardPage() {
  const user = await getNetworkUser();
  const hasProfile = user?.accountType === "business" || user?.accountType === "professional";

  return (
    <div className="rounded-lg border border-n200 bg-white p-8">
      <h1 className="font-display text-2xl font-medium text-ink">Welcome, {user?.name}</h1>
      <p className="mt-2 text-[15px] text-n600">
        Your {user?.accountType} account is set up.
        {hasProfile ? (
          <>
            {" "}
            <Link href="/dashboard/profile" className="font-semibold text-petrol">
              Set up your public profile
            </Link>{" "}
            to get started. Directory and search features are coming in a later release.
          </>
        ) : (
          " Profile and directory features are coming in a later release."
        )}
      </p>
    </div>
  );
}
