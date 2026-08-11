import type { Metadata } from "next";
import { getNetworkUser } from "@/lib/network/session";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Phase 9A ships the shell only — profile/portfolio/inbox content is
 * Phase 9B/9D scope. The layout above already redirects unauthenticated
 * visitors before this ever renders, so `user` is guaranteed non-null here.
 */
export default async function DashboardPage() {
  const user = await getNetworkUser();

  return (
    <div className="rounded-lg border border-n200 bg-white p-8">
      <h1 className="font-display text-2xl font-medium text-ink">Welcome, {user?.name}</h1>
      <p className="mt-2 text-[15px] text-n600">
        Your {user?.accountType} account is set up. Profile, portfolio, and directory features are
        coming in a later release.
      </p>
    </div>
  );
}
