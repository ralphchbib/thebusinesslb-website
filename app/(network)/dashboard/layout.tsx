import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { logoutAction } from "@/lib/network/actions";
import { Button } from "@/components/ui/button";
import { DashboardNav } from "@/components/network/dashboard-nav";

/**
 * Phase 9A route protection — reads the network-accounts session (via the
 * Bearer-bridge in lib/network/session.ts, not a cookie-name match) on
 * every request under /dashboard/*. No matching session → redirect to
 * /login before rendering anything, per PHASE9A-TECHNICAL-DESIGN.md §C/§D.
 * Deliberately a layout-level check, not a middleware.ts change, so the
 * existing shared CSP/security-header middleware and its matcher stay
 * completely untouched (see the design doc's Risk table). Unchanged in
 * Phase 9D — only the surrounding shell (nav, width) changes below.
 *
 * Phase 9D — the nav items list is built here, from the account type, and
 * handed to the client DashboardNav component for active-state
 * highlighting. Business/Professional accounts get Profile + Portfolio;
 * every other account type keeps the same Overview + Settings it already
 * had — Consumer/Institution/Diaspora dashboards are explicitly out of
 * this phase's scope (PHASE9D-TECHNICAL-DESIGN.md §B).
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getNetworkUser();
  if (!user) {
    redirect("/login");
  }

  const hasProfile = user.accountType === "business" || user.accountType === "professional";
  const navItems = [
    { href: "/dashboard", label: "Overview" },
    ...(hasProfile
      ? [
          { href: "/dashboard/profile", label: "My Profile" },
          { href: "/dashboard/profile/portfolio", label: "Portfolio" },
          { href: "/dashboard/verification", label: "Verification" },
          { href: "/dashboard/reviews", label: "Reviews" },
        ]
      : []),
    { href: "/dashboard/settings", label: "Settings" },
  ];

  return (
    <div className="w-full max-w-5xl">
      <div className="mb-6 flex items-center justify-between rounded-lg border border-n200 bg-white px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-ink">{user.name}</p>
          <p className="text-[13px] capitalize text-n500">{user.accountType} account</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="secondary" size="sm">
            Log out
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="w-full flex-none md:w-56">
          <div className="rounded-lg border border-n200 bg-white p-3">
            <DashboardNav items={navItems} />
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
