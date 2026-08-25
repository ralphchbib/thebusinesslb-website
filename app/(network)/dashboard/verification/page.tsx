import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCms } from "@/lib/cms/client";
import { getNetworkUser } from "@/lib/network/session";
import { VerificationRequestForm } from "@/components/network/verification-request-form";
import { AppealForm } from "@/components/network/appeal-form";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Verification" };

const RENEWAL_WINDOW_DAYS = 30;

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

  const now = Date.now();
  const expiresAt = request?.expiresAt as string | undefined;
  const renewalOpensAt = expiresAt ? new Date(expiresAt) : null;
  if (renewalOpensAt) renewalOpensAt.setDate(renewalOpensAt.getDate() - RENEWAL_WINDOW_DAYS);
  const inRenewalWindow = Boolean(renewalOpensAt && now >= renewalOpensAt.getTime());

  const canAppeal =
    Boolean(request?.appealDeadline) &&
    new Date(request!.appealDeadline as string).getTime() > now &&
    ["rejected", "revoked"].includes(request?.status as string);

  const canSubmit = !isVerified && (!request || ["rejected", "revoked"].includes(request.status as string) || (request.status === "approved" && inRenewalWindow));

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
            {verifiedAt && <span className="text-[13px] text-n500">since {new Date(verifiedAt).toLocaleDateString()}</span>}
            {expiresAt && (
              <span className="text-[13px] text-n500">
                — {inRenewalWindow ? "renewal open, " : ""}expires {new Date(expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        ) : request?.status === "pending" || request?.status === "under-review" ? (
          <div className="mt-5">
            <Badge variant="neutral">{request.status === "under-review" ? "Under review" : "Pending review"}</Badge>
            <p className="mt-2 text-[13px] text-n500">Submitted {new Date(request.createdAt as string).toLocaleDateString()}.</p>
          </div>
        ) : request?.status === "rejected" ? (
          <div className="mt-5">
            <Badge variant="neutral">Not verified</Badge>
            {Boolean(request.reviewNote) && <p className="mt-2 text-[13px] text-n600">Reviewer note: {request.reviewNote as string}</p>}
            {canAppeal && (
              <div className="mt-3">
                <p className="text-[13px] font-medium text-n700">Disagree with this decision?</p>
                <AppealForm caseId={request.id as string | number} caseType="verification-requests" />
              </div>
            )}
          </div>
        ) : request?.status === "revoked" ? (
          <div className="mt-5">
            <Badge variant="neutral">Verification removed</Badge>
            {Boolean(request.revocationReason) && <p className="mt-2 text-[13px] text-n600">Reason: {request.revocationReason as string}</p>}
            {canAppeal && (
              <div className="mt-3">
                <p className="text-[13px] font-medium text-n700">Disagree with this decision?</p>
                <AppealForm caseId={request.id as string | number} caseType="verification-requests" />
              </div>
            )}
          </div>
        ) : null}
      </div>

      {canSubmit && (
        <div className="rounded-lg border border-n200 bg-white p-8">
          <h2 className="font-display text-xl font-medium text-ink">
            {request?.status === "rejected" || request?.status === "revoked" ? "Submit again" : inRenewalWindow ? "Renew your verification" : "Request verification"}
          </h2>
          <div className="mt-4">
            <VerificationRequestForm />
          </div>
        </div>
      )}
    </div>
  );
}
