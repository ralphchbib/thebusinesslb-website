import { redirect } from "next/navigation";
import Link from "next/link";
import { getNetworkUser } from "@/lib/network/session";
import { logoutAction } from "@/lib/network/actions";
import { Button } from "@/components/ui/button";

/**
 * Phase 9A route protection — reads the network-accounts session (via the
 * Bearer-bridge in lib/network/session.ts, not a cookie-name match) on
 * every request under /dashboard/*. No matching session → redirect to
 * /login before rendering anything, per PHASE9A-TECHNICAL-DESIGN.md §C/§D.
 * Deliberately a layout-level check, not a middleware.ts change, so the
 * existing shared CSP/security-header middleware and its matcher stay
 * completely untouched (see the design doc's Risk table).
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getNetworkUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6 flex items-center justify-between rounded-lg border border-n200 bg-white px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-ink">{user.name}</p>
          <p className="text-[13px] capitalize text-n500">{user.accountType} account</p>
        </div>
        <div className="flex items-center gap-4">
          {(user.accountType === "business" || user.accountType === "professional") && (
            <Link href="/dashboard/profile" className="text-[13px] font-semibold text-petrol">
              My Profile
            </Link>
          )}
          <Link href="/dashboard/settings" className="text-[13px] font-semibold text-petrol">
            Settings
          </Link>
          <form action={logoutAction}>
            <Button type="submit" variant="secondary" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
