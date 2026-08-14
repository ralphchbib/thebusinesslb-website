import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCms } from "@/lib/cms/client";
import { getNetworkUser } from "@/lib/network/session";
import { VerificationRequestForm } from "@/components/network/verification-request-form";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Verification" };

export default async function VerificationPage() {
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

  const latestRequest = await payload.find({
    collection: "verification-requests",
    where: { owner: { equals: user.id } },
    sort: "-createdAt",
    limit: 1,
    overrideAccess: true,
  });

  const isVerified = Boolean(profile.docs[0]?.verified);
  const verifiedAt = profile.docs[0]?.verifiedAt as string | undefined;
  const request = latestRequest.docs[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Verification</h1>
        <p className="mt-1 text-[13px] text-n500">
          A staff member reviews what you submit and decides whether your profile shows a Verified badge. This
          doesn&rsquo;t check registry records or credentials — it&rsquo;s a review of what you told us, and it
          doesn&rsquo;t guarantee ongoing quality or resolve disputes.
        </p>

        {isVerified ? (
          <div className="mt-5 flex items-center gap-2">
            <Badge variant="petrol">Verified</Badge>
            {verifiedAt && (
              <span className="text-[13px] text-n500">since {new Date(verifiedAt).toLocaleDateString()}</span>
            )}
          </div>
        ) : request?.status === "pending" ? (
          <div className="mt-5">
            <Badge variant="neutral">Pending review</Badge>
            <p className="mt-2 text-[13px] text-n500">Submitted {new Date(request.createdAt as string).toLocaleDateString()}.</p>
          </div>
        ) : request?.status === "rejected" ? (
          <div className="mt-5">
            <Badge variant="neutral">Not verified</Badge>
            {Boolean(request.reviewNote) && (
              <p className="mt-2 text-[13px] text-n600">Reviewer note: {request.reviewNote as string}</p>
            )}
          </div>
        ) : null}
      </div>

      {!isVerified && request?.status !== "pending" && (
        <div className="rounded-lg border border-n200 bg-white p-8">
          <h2 className="font-display text-xl font-medium text-ink">
            {request?.status === "rejected" ? "Submit again" : "Request verification"}
          </h2>
          <div className="mt-4">
            <VerificationRequestForm />
          </div>
        </div>
      )}
    </div>
  );
}
