import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getCms } from "@/lib/cms/client";
import { getNetworkUser } from "@/lib/network/session";
import { getPublishedReviews, getPublishedRecommendations } from "@/lib/cms/trust";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema-org";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/network/verified-badge";
import { ReviewForm } from "@/components/network/review-form";
import { RecommendationForm } from "@/components/network/recommendation-form";
import { ReportContentButton } from "@/components/network/report-content-button";
import { SaveButton } from "@/components/network/save-button";
import { FollowButton } from "@/components/network/follow-button";
import { isProfileSaved, isProfileFollowed, getFollowerCount } from "@/lib/network/social";

/**
 * Phase 9B — public business profile. A draft is only visible to its
 * owner or staff (PHASE9B-TECHNICAL-DESIGN.md §D) — enforced here by
 * checking `_status` explicitly against the viewer, not just relying on
 * `overrideAccess`, since this page always needs the document (to tell a
 * draft from a 404) but must not leak a draft's content to anyone else.
 */
async function getProfile(slug: string) {
  const payload = await getCms();
  const result = await payload.find({
    collection: "business-profiles",
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  });
  return result.docs[0] ?? null;
}

async function canView(profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>) {
  if (profile._status === "published") return true;
  const user = await getNetworkUser();
  if (!user) return false;
  const ownerId = typeof profile.owner === "object" ? (profile.owner as { id?: unknown })?.id : profile.owner;
  return String(ownerId) === String(user.id);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile || !(await canView(profile))) return {};
  return buildMetadata({
    title: `${profile.companyName as string} | THE BUSINESS lb`,
    description: profile.description as string,
    path: `/network/businesses/${slug}/`,
  });
}

export default async function BusinessProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile || !(await canView(profile))) notFound();

  const logo = typeof profile.logo === "object" ? (profile.logo as { url?: string; alt?: string }) : undefined;
  const services = (profile.services as { name: string; description?: string }[]) ?? [];
  const socialLinks = (profile.socialLinks as { label: string; url: string }[]) ?? [];

  const ownerId = typeof profile.owner === "object" ? (profile.owner as { id?: unknown })?.id : profile.owner;
  const portfolio = await (async () => {
    const payload = await getCms();
    // Queried by owner, not the polymorphic `profile` field — a flat
    // relationship query is well-established in this codebase, unlike a
    // query into a polymorphic relationTo, which has no existing
    // precedent to verify against (PHASE9B-TECHNICAL-DESIGN.md §F). Since
    // one account owns at most one business profile, "owned by this
    // profile's owner" and "attached to this profile" are equivalent.
    const result = await payload.find({
      collection: "portfolio-projects",
      where: { owner: { equals: ownerId } },
      overrideAccess: true,
    });
    return result.docs;
  })();

  const languages = (profile.languages as string[]) ?? [];

  const viewer = await getNetworkUser();
  const isOwner = viewer ? String(viewer.id) === String(ownerId) : false;
  const [reviews, recommendations, isSaved, isFollowing, followerCount] = await Promise.all([
    getPublishedReviews("business-profiles", profile.id as string | number),
    getPublishedRecommendations("business-profiles", profile.id as string | number),
    viewer ? isProfileSaved(viewer.id, "business-profiles", profile.id as string | number) : Promise.resolve(false),
    viewer && !isOwner ? isProfileFollowed(viewer.id, "business-profiles", profile.id as string | number) : Promise.resolve(false),
    isOwner ? getFollowerCount("business-profiles", profile.id as string | number) : Promise.resolve(null),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        // profile.companyName is public, self-service, owner-controlled input
        // (Phase 9B). Without escaping `<`, a company name containing a
        // literal `</script>` closes this tag early in the HTML parser and
        // lets an attacker-chosen sibling <script> execute — confirmed
        // exploitable live during Phase 9C release review before this fix.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Businesses", path: "/network/businesses/" },
              { name: profile.companyName as string, path: `/network/businesses/${slug}/` },
            ]),
          ).replace(/</g, "\\u003c"),
        }}
      />
      <Breadcrumb items={[{ name: "Businesses", href: "/network/businesses" }, { name: profile.companyName as string }]} />
      <Section>
      {profile._status === "draft" && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          This profile is unpublished — only you can see this preview.
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {logo?.url && <Image src={logo.url} alt={logo.alt ?? profile.companyName as string} width={64} height={64} className="rounded-md" />}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-medium text-ink">{profile.companyName as string}</h1>
              {Boolean(profile.verified) && <VerifiedBadge verifiedAt={profile.verifiedAt as string | undefined} />}
            </div>
            {(Boolean(profile.industry) || Boolean(profile.category)) && (
              <p className="text-n500">
                {[profile.industry, profile.category].filter(Boolean).join(" · ")}
              </p>
            )}
            {isOwner && followerCount !== null && (
              <p className="mt-1 text-[13px] text-n500">
                {followerCount} {followerCount === 1 ? "person follows" : "people follow"} your profile
              </p>
            )}
          </div>
        </div>
        {viewer && (
          <div className="flex flex-none items-center gap-2">
            <SaveButton profileType="business-profiles" profileId={profile.id as string | number} initiallySaved={isSaved} />
            {!isOwner && <FollowButton profileType="business-profiles" profileId={profile.id as string | number} initiallyFollowing={isFollowing} />}
          </div>
        )}
      </div>

      <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-n700">{profile.description as string}</p>

      {Boolean(profile.location) && <p className="mt-4 text-[15px] text-n600">📍 {profile.location as string}</p>}

      {languages.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {languages.map((lang) => (
            <Badge key={lang} variant="neutral">
              {lang}
            </Badge>
          ))}
        </div>
      )}

      {(Boolean(profile.contactEmail) || Boolean(profile.contactPhone)) && (
        <div className="mt-4 flex flex-col gap-1 text-[15px] text-n600">
          {Boolean(profile.contactEmail) && <p>{profile.contactEmail as string}</p>}
          {Boolean(profile.contactPhone) && <p>{profile.contactPhone as string}</p>}
        </div>
      )}

      {socialLinks.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4">
          {socialLinks.map((link) => (
            <a key={link.url} href={link.url} className="text-[13px] font-semibold text-petrol" target="_blank" rel="noopener noreferrer">
              {link.label}
            </a>
          ))}
        </div>
      )}

      {services.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-2xl font-medium text-ink">Services</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {services.map((service) => (
              <div key={service.name} className="rounded-lg border border-n200 bg-white p-5">
                <h3 className="text-[15px] font-semibold text-ink">{service.name}</h3>
                {Boolean(service.description) && <p className="mt-1 text-[14px] text-n600">{service.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {portfolio.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-2xl font-medium text-ink">Portfolio</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {portfolio.map((item) => (
              <div key={item.id} className="rounded-lg border border-n200 bg-white p-5">
                <h3 className="text-[15px] font-semibold text-ink">{item.title as string}</h3>
                {Boolean(item.description) && <p className="mt-1 text-[14px] text-n600">{item.description as string}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-medium text-ink">Reviews {reviews.count > 0 && `(${reviews.count})`}</h2>
          {reviews.averageRating !== null && (
            <span className="text-[15px] font-medium text-brass">{"★".repeat(Math.round(reviews.averageRating))} {reviews.averageRating.toFixed(1)}</span>
          )}
        </div>

        {reviews.items.length === 0 ? (
          <p className="mt-3 text-[14px] text-n500">No reviews yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            {reviews.items.map((review) => (
              <div key={review.id} className="rounded-lg border border-n200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-brass">{"★".repeat(review.rating)}</span>
                    <span className="text-[13px] font-medium text-ink">{review.reviewerName}</span>
                  </div>
                  {viewer && !isOwner && <ReportContentButton targetCollection="reviews" targetId={review.id} />}
                </div>
                <p className="mt-2 text-[14px] text-n700">{review.body}</p>
                {review.businessReply && (
                  <div className="mt-3 rounded-md bg-n100 p-3">
                    <p className="text-[12px] font-semibold text-n600">Response from {profile.companyName as string}</p>
                    <p className="mt-1 text-[13px] text-n700">{review.businessReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {viewer && !isOwner && (
          <div className="mt-6 rounded-lg border border-n200 bg-white p-5">
            <h3 className="text-[15px] font-semibold text-ink">Write a review</h3>
            <div className="mt-3">
              <ReviewForm profileType="business-profiles" profileId={profile.id as string | number} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="font-display text-2xl font-medium text-ink">
          Recommendations {recommendations.count > 0 && `(${recommendations.count})`}
        </h2>

        {recommendations.items.length === 0 ? (
          <p className="mt-3 text-[14px] text-n500">No recommendations yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            {recommendations.items.map((rec) => (
              <div key={rec.id} className="rounded-lg border border-n200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink">{rec.recommenderName}</span>
                  {viewer && !isOwner && <ReportContentButton targetCollection="recommendations" targetId={rec.id} />}
                </div>
                <p className="mt-2 text-[14px] text-n700">{rec.body}</p>
              </div>
            ))}
          </div>
        )}

        {viewer && !isOwner && (
          <div className="mt-6 rounded-lg border border-n200 bg-white p-5">
            <h3 className="text-[15px] font-semibold text-ink">Recommend {profile.companyName as string}</h3>
            <div className="mt-3">
              <RecommendationForm profileType="business-profiles" profileId={profile.id as string | number} />
            </div>
          </div>
        )}
      </div>
      </Section>
    </>
  );
}
