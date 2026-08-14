import type { Metadata } from "next";
import Link from "next/link";
import { getCms } from "@/lib/cms/client";
import { getNetworkUser } from "@/lib/network/session";
import {
  computeBusinessProfileCompletion,
  computeProfessionalProfileCompletion,
  type ProfileCompletion,
  type BusinessProfileForCompletion,
  type ProfessionalProfileForCompletion,
} from "@/lib/network/profile-completion";
import { getActivityFeed } from "@/lib/network/activity";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

function CompletionBar({ completion }: { completion: ProfileCompletion }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[13px] text-n600">
        <span>Profile completion</span>
        <span className="font-semibold text-ink">{completion.percentage}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-n100">
        <div className="h-full rounded-full bg-petrol transition-all" style={{ width: `${completion.percentage}%` }} />
      </div>
      {completion.missing.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 text-[13px] text-n600">
          {completion.missing.map((check) => (
            <li key={check.key} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-n300" />
              {check.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Phase 11 — "Updates from who you follow," the read-time-computed panel
 * described in PHASE11-TECHNICAL-DESIGN.md §J Option A. Rendered on the
 * Overview page for account types without their own profile — see this
 * file's other comment for why business/professional's Overview is left
 * unchanged instead of gaining this same panel.
 */
function ActivityPanel({ items }: { items: Awaited<ReturnType<typeof getActivityFeed>> }) {
  return (
    <div className="rounded-lg border border-n200 bg-white p-8">
      <h2 className="font-display text-xl font-medium text-ink">Updates from who you follow</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-n500">
          Nothing new in the last 30 days. Follow a business or professional to see their updates here.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="text-[14px] text-n700">
              <Link href={item.profileHref} className="font-medium text-petrol hover:underline">
                {item.description}
              </Link>
              <span className="ml-2 text-[12px] text-n500">{new Date(item.date).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Phase 9D — account-type-aware home, replacing the previous generic
 * "Welcome" stub (whose copy had gone stale — it still claimed directory
 * search was "coming in a later release" after Phase 9C shipped it).
 * Business/Professional accounts get a real overview: profile completion
 * (computed live from their own data, never stored — see
 * lib/network/profile-completion.ts), publish status, and quick links.
 *
 * Phase 11 — every other account type (consumer, institution, diaspora)
 * now gets the "My Market" home Blueprint v3 §15 describes: the same
 * welcome copy plus a live Activity Feed panel of updates from profiles
 * the account follows (PHASE11-TECHNICAL-DESIGN.md §C/§J).
 * Business/Professional's Overview is deliberately left unchanged — their
 * page is about their own profile, and Saved/Following/Saved Searches
 * live under their own dedicated nav items for every account type instead
 * of crowding this one.
 */
export default async function DashboardPage() {
  const user = await getNetworkUser();
  const hasProfile = user?.accountType === "business" || user?.accountType === "professional";

  if (!user || !hasProfile) {
    const activity = user ? await getActivityFeed(user.id) : [];
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-n200 bg-white p-8">
          <h1 className="font-display text-2xl font-medium text-ink">Welcome, {user?.name}</h1>
          <p className="mt-2 text-[15px] text-n600">
            Your {user?.accountType} account is set up. Business and Professional profiles, directories and search are
            live on THE BUSINESS Network — browse them at{" "}
            <Link href="/network" className="font-semibold text-petrol">
              /network
            </Link>
            .
          </p>
        </div>
        {user && <ActivityPanel items={activity} />}
      </div>
    );
  }

  const collection = user.accountType === "business" ? "business-profiles" : "professional-profiles";
  const payload = await getCms();
  const existing = await payload.find({
    collection,
    where: { owner: { equals: user.id } },
    limit: 1,
    overrideAccess: true,
  });
  const profile = existing.docs[0];

  if (!profile) {
    return (
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Welcome, {user.name}</h1>
        <p className="mt-2 text-[15px] text-n600">
          You haven&rsquo;t created your {user.accountType} profile yet.
        </p>
        <Button asChild className="mt-5">
          <Link href="/dashboard/profile">Create your profile</Link>
        </Button>
      </div>
    );
  }

  const portfolioResult = await payload.find({
    collection: "portfolio-projects",
    where: { owner: { equals: user.id } },
    limit: 1,
    overrideAccess: true,
  });
  const portfolioCount = portfolioResult.totalDocs;

  const completion =
    user.accountType === "business"
      ? computeBusinessProfileCompletion(profile as unknown as BusinessProfileForCompletion, portfolioCount)
      : computeProfessionalProfileCompletion(profile as unknown as ProfessionalProfileForCompletion, portfolioCount);

  const isPublished = profile._status === "published";
  const publicHref = user.accountType === "business" ? `/network/businesses/${profile.slug}` : `/network/professionals/${profile.slug}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-medium text-ink">Welcome, {user.name}</h1>
          <span
            className={`rounded-full px-3 py-1 text-[13px] font-medium ${isPublished ? "bg-petrol-tint text-petrol" : "bg-n100 text-n600"}`}
          >
            {isPublished ? "Published" : "Draft"}
          </span>
        </div>

        <div className="mt-6">
          <CompletionBar completion={completion} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="sm">
            <Link href="/dashboard/profile">Edit profile</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/dashboard/profile/portfolio">Manage portfolio</Link>
          </Button>
          {isPublished && (
            <Button asChild size="sm" variant="secondary">
              <Link href={publicHref}>View public profile</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
