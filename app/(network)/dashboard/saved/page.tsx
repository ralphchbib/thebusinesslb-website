import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getSavedProfiles } from "@/lib/network/social";
import { SaveButton } from "@/components/network/save-button";
import { VerifiedBadge } from "@/components/network/verified-badge";

export const metadata: Metadata = { title: "Saved Profiles" };

function ProfileList({
  items,
  profileType,
  basePath,
  emptyMessage,
}: {
  items: Awaited<ReturnType<typeof getSavedProfiles>>["businesses"];
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
          <SaveButton profileType={profileType} profileId={item.id} initiallySaved />
        </div>
      ))}
    </div>
  );
}

export default async function SavedPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");

  const { businesses, professionals } = await getSavedProfiles(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Saved Profiles</h1>
        <p className="mt-1 text-[13px] text-n500">Businesses and professionals you&rsquo;ve bookmarked.</p>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Saved Businesses ({businesses.length})</h2>
        <ProfileList items={businesses} profileType="business-profiles" basePath="/network/businesses" emptyMessage="No saved businesses yet." />
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Saved Professionals ({professionals.length})</h2>
        <ProfileList items={professionals} profileType="professional-profiles" basePath="/network/professionals" emptyMessage="No saved professionals yet." />
      </div>
    </div>
  );
}
