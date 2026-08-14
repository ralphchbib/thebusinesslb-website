import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getFollowedProfiles } from "@/lib/network/social";
import { FollowButton } from "@/components/network/follow-button";
import { VerifiedBadge } from "@/components/network/verified-badge";

export const metadata: Metadata = { title: "Following" };

function ProfileList({
  items,
  profileType,
  basePath,
  emptyMessage,
}: {
  items: Awaited<ReturnType<typeof getFollowedProfiles>>["businesses"];
  profileType: "business-profiles" | "professional-profiles";
  basePath: string;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="mt-3 text-[13px] text-n500">{emptyMessage}</p>;
  }
  return (
    <div className="mt-4 flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded-md border border-n200 p-4">
          <Link href={`${basePath}/${item.slug}`} className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-ink">{item.name}</span>
            {item.verified && <VerifiedBadge />}
          </Link>
          <FollowButton profileType={profileType} profileId={item.id} initiallyFollowing />
        </div>
      ))}
    </div>
  );
}

export default async function FollowingPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");

  const { businesses, professionals } = await getFollowedProfiles(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Following</h1>
        <p className="mt-1 text-[13px] text-n500">Businesses and professionals you follow for updates.</p>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Businesses I Follow ({businesses.length})</h2>
        <ProfileList items={businesses} profileType="business-profiles" basePath="/network/businesses" emptyMessage="Not following any businesses yet." />
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Professionals I Follow ({professionals.length})</h2>
        <ProfileList items={professionals} profileType="professional-profiles" basePath="/network/professionals" emptyMessage="Not following any professionals yet." />
      </div>
    </div>
  );
}
