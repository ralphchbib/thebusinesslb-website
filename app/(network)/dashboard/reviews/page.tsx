import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCms } from "@/lib/cms/client";
import { getNetworkUser } from "@/lib/network/session";
import { ReviewReplyForm } from "@/components/network/review-reply-form";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Reviews & Recommendations" };

export default async function ReviewsPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");
  if (user.accountType !== "business" && user.accountType !== "professional") {
    redirect("/dashboard");
  }

  const collection = user.accountType === "business" ? "business-profiles" : "professional-profiles";
  const payload = await getCms();

  const profile = await payload.find({
    collection,
    where: { owner: { equals: user.id } },
    limit: 1,
    overrideAccess: true,
  });
  const profileDoc = profile.docs[0];

  if (!profileDoc) {
    return (
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Reviews &amp; Recommendations</h1>
        <p className="mt-2 text-[13px] text-n500">Save your profile first — reviews and recommendations appear here once you have one.</p>
      </div>
    );
  }

  const key = `${collection}:${profileDoc.id}`;

  const [reviews, recommendations] = await Promise.all([
    payload.find({
      collection: "reviews",
      where: { profileKey: { equals: key }, status: { equals: "published" } },
      sort: "-createdAt",
      overrideAccess: true,
    }),
    payload.find({
      collection: "recommendations",
      where: { profileKey: { equals: key }, status: { equals: "published" } },
      sort: "-createdAt",
      overrideAccess: true,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Reviews &amp; Recommendations</h1>
        <p className="mt-1 text-[13px] text-n500">What others have said about your profile. You can reply once to each review.</p>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Reviews ({reviews.totalDocs})</h2>
        {reviews.docs.length === 0 ? (
          <p className="mt-3 text-[13px] text-n500">No reviews yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            {reviews.docs.map((review) => {
              const reviewerName = typeof review.owner === "object" ? ((review.owner as { name?: string })?.name ?? "A member") : "A member";
              return (
                <div key={review.id as string} className="border-b border-n200 pb-5 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="brass">{"★".repeat(review.rating as number)}</Badge>
                    <span className="text-[13px] font-medium text-ink">{reviewerName}</span>
                  </div>
                  <p className="mt-2 text-[14px] text-n700">{review.body as string}</p>
                  {review.businessReply ? (
                    <div className="mt-3 rounded-md bg-n100 p-3">
                      <p className="text-[12px] font-semibold text-n600">Your reply</p>
                      <p className="mt-1 text-[13px] text-n700">{review.businessReply as string}</p>
                    </div>
                  ) : (
                    <ReviewReplyForm reviewId={review.id as string} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Recommendations ({recommendations.totalDocs})</h2>
        {recommendations.docs.length === 0 ? (
          <p className="mt-3 text-[13px] text-n500">No recommendations yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            {recommendations.docs.map((rec) => {
              const recommenderName = typeof rec.owner === "object" ? ((rec.owner as { name?: string })?.name ?? "A member") : "A member";
              return (
                <div key={rec.id as string} className="border-b border-n200 pb-5 last:border-b-0 last:pb-0">
                  <span className="text-[13px] font-medium text-ink">{recommenderName}</span>
                  <p className="mt-2 text-[14px] text-n700">{rec.body as string}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
