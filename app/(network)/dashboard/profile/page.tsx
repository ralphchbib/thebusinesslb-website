import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCms } from "@/lib/cms/client";
import { getNetworkUser } from "@/lib/network/session";
import { publishProfileAction } from "@/lib/network/profile-actions";
import { BusinessProfileForm } from "@/components/network/business-profile-form";
import { ProfessionalProfileForm } from "@/components/network/professional-profile-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My profile" };

/**
 * Phase 9B — the logged-in account's own profile editor. Only business
 * and professional accounts have a profile to edit in this phase
 * (PHASE9B-TECHNICAL-DESIGN.md §A); consumer/institution/diaspora
 * accounts are redirected back to the dashboard shell.
 */
export default async function ProfilePage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");
  if (user.accountType !== "business" && user.accountType !== "professional") {
    redirect("/dashboard");
  }

  const payload = await getCms();
  const collection = user.accountType === "business" ? "business-profiles" : "professional-profiles";
  const existing = await payload.find({
    collection,
    where: { owner: { equals: user.id } },
    limit: 1,
    overrideAccess: true,
  });
  const profile = existing.docs[0];
  const isPublished = profile?._status === "published";

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-medium text-ink">My profile</h1>
          {profile && (
            <span className={`rounded-full px-3 py-1 text-[13px] font-medium ${isPublished ? "bg-petrol-tint text-petrol" : "bg-n100 text-n600"}`}>
              {isPublished ? "Published" : "Draft"}
            </span>
          )}
        </div>

        {profile && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {isPublished && (
              <Link
                href={collection === "business-profiles" ? `/network/businesses/${profile.slug}` : `/network/professionals/${profile.slug}`}
                className="text-[13px] font-semibold text-petrol"
              >
                View public profile →
              </Link>
            )}
            <form
              action={async () => {
                "use server";
                await publishProfileAction(!isPublished);
              }}
            >
              <Button type="submit" variant="secondary" size="sm">
                {isPublished ? "Unpublish" : "Publish"}
              </Button>
            </form>
            <Link href="/dashboard/profile/portfolio" className="text-[13px] font-semibold text-petrol">
              Manage portfolio →
            </Link>
          </div>
        )}

        <div className="mt-6">
          {user.accountType === "business" ? (
            <BusinessProfileForm
              defaultValues={
                profile
                  ? {
                      companyName: profile.companyName as string,
                      slug: profile.slug as string,
                      description: profile.description as string,
                      industry: (profile.industry as string) ?? "",
                      category: (profile.category as string) ?? "",
                      location: (profile.location as string) ?? "",
                      languages: (profile.languages as string[]) ?? [],
                      contactEmail: (profile.contactEmail as string) ?? "",
                      contactPhone: (profile.contactPhone as string) ?? "",
                      servicesText: ((profile.services as { name: string; description?: string }[]) ?? [])
                        .map((s) => `${s.name}${s.description ? `: ${s.description}` : ""}`)
                        .join("\n"),
                      socialLinksText: ((profile.socialLinks as { label: string; url: string }[]) ?? [])
                        .map((s) => `${s.label}: ${s.url}`)
                        .join("\n"),
                      logoUrl: typeof profile.logo === "object" ? (profile.logo as { url?: string })?.url : undefined,
                    }
                  : undefined
              }
            />
          ) : (
            <ProfessionalProfileForm
              defaultValues={
                profile
                  ? {
                      name: profile.name as string,
                      slug: profile.slug as string,
                      title: profile.title as string,
                      category: (profile.category as string) ?? "",
                      location: (profile.location as string) ?? "",
                      languages: (profile.languages as string[]) ?? [],
                      bio: profile.bio as string,
                      contactEmail: (profile.contactEmail as string) ?? "",
                      contactPhone: (profile.contactPhone as string) ?? "",
                      skillsText: ((profile.skills as { skill: string }[]) ?? []).map((s) => s.skill).join(", "),
                      experienceText: ((profile.experience as { role: string; company?: string; description?: string }[]) ?? [])
                        .map((e) => `${e.role}${e.company ? ` at ${e.company}` : ""}${e.description ? ` — ${e.description}` : ""}`)
                        .join("\n"),
                      servicesText: ((profile.services as { name: string; description?: string }[]) ?? [])
                        .map((s) => `${s.name}${s.description ? `: ${s.description}` : ""}`)
                        .join("\n"),
                      photoUrl: typeof profile.photo === "object" ? (profile.photo as { url?: string })?.url : undefined,
                    }
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
