import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getOwnPostings, getPostingResponses } from "@/lib/network/market";
import { CreatePostingForm } from "@/components/network/create-posting-form";
import { PostingStatusButtons } from "@/components/network/posting-status-buttons";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Opportunities" };

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  fulfilled: "Fulfilled",
  expired: "Expired",
  closed: "Closed",
};

/**
 * Blueprint §18 — the Opportunity Dashboard: post an Offer/Need, manage
 * your own postings' status, and see who's responded to each one
 * (PHASE13-TECHNICAL-DESIGN.md §K). Responses reuse the exact same
 * Connections data Phase 12's /dashboard/connections already shows —
 * this page is a posting-scoped view onto it, not a second source of
 * truth (`getPostingResponses` reads `connections` filtered by
 * `originPosting`).
 */
export default async function OpportunitiesDashboardPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");

  const postings = await getOwnPostings(user.id);
  const responsesByPosting = await Promise.all(
    postings.map(async (posting) => ({ postingId: posting.id, responses: await getPostingResponses(posting.id, user.id) })),
  );
  const responseMap = new Map(responsesByPosting.map((r) => [r.postingId, r.responses]));

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Opportunities</h1>
        <p className="mt-1 text-[13px] text-n500">
          Blueprint §18 Offer and Need Exchange — post what you offer or need, and see who responds.
        </p>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Post an Offer or Need</h2>
        <div className="mt-4">
          <CreatePostingForm />
        </div>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">My Postings ({postings.length})</h2>
        {postings.length === 0 ? (
          <p className="mt-3 text-[13px] text-n500">You haven&rsquo;t posted anything yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            {postings.map((posting) => {
              const responses = responseMap.get(posting.id) ?? [];
              return (
                <div key={posting.id} className="rounded-md border border-n200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={posting.postingType === "offer" ? "petrol" : "neutral"}>
                        {posting.postingType === "offer" ? "Offer" : "Need"}
                      </Badge>
                      <span className="text-[14px] font-medium text-ink">{posting.title}</span>
                      <Badge variant="ink">{STATUS_LABELS[posting.status] ?? posting.status}</Badge>
                    </div>
                    {posting.status === "active" && <PostingStatusButtons postingId={posting.id} />}
                  </div>
                  <p className="mt-2 text-[13px] text-n600">{posting.description}</p>

                  <div className="mt-3">
                    <h3 className="text-[12px] font-semibold uppercase tracking-wide text-n500">
                      Responses ({responses.length})
                    </h3>
                    {responses.length === 0 ? (
                      <p className="mt-1 text-[13px] text-n500">No responses yet.</p>
                    ) : (
                      <div className="mt-2 flex flex-col gap-2">
                        {responses.map((r) => (
                          <div key={r.connectionId} className="rounded-md bg-n100 p-3 text-[13px]">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-ink">{r.responderName}</span>
                              <span className="text-n500">{r.status}</span>
                            </div>
                            <p className="mt-1 text-n600">{r.reason}</p>
                            {r.status === "pending" && (
                              <p className="mt-1 text-n500">
                                Respond from{" "}
                                <Link href="/dashboard/connections" className="font-semibold text-petrol">
                                  Connections
                                </Link>
                                .
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
