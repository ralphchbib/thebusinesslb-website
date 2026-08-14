import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getSavedSearches, savedSearchHref } from "@/lib/network/social";
import { DeleteSavedSearchButton } from "@/components/network/delete-saved-search-button";

export const metadata: Metadata = { title: "Saved Searches" };

export default async function SavedSearchesPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");

  const searches = await getSavedSearches(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Saved Searches</h1>
        <p className="mt-1 text-[13px] text-n500">Directory filter combinations you&rsquo;ve saved — click one to re-run it.</p>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        {searches.length === 0 ? (
          <p className="text-[13px] text-n500">No saved searches yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {searches.map((search) => (
              <div key={search.id} className="flex items-center justify-between rounded-md border border-n200 p-4">
                <Link href={savedSearchHref(search)} className="text-[14px] font-medium text-petrol hover:underline">
                  {search.label}
                  <span className="ml-2 text-[12px] font-normal capitalize text-n500">({search.profileType})</span>
                </Link>
                <DeleteSavedSearchButton id={search.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
