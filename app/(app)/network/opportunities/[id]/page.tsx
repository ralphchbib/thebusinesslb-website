import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostingById } from "@/lib/network/market";
import { getNetworkUser } from "@/lib/network/session";
import { getConnectionState } from "@/lib/network/messaging";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema-org";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Badge } from "@/components/ui/badge";
import { RespondToPostingButton } from "@/components/network/respond-to-posting-button";
import { ConnectionStatusNote } from "@/components/network/connect-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const posting = await getPostingById(id);
  if (!posting) return {};
  return buildMetadata({
    title: `${posting.title} | THE BUSINESS lb`,
    description: posting.description,
    path: `/network/opportunities/${id}/`,
  });
}

/**
 * Blueprint §18 — a single Offer/Need posting, with a Respond entry point
 * that reuses ConnectButton's exact structured-introduction UX
 * (PHASE13-TECHNICAL-DESIGN.md §H). `getPostingById` already restricts a
 * non-active posting to its own owner, so a 404 here correctly covers both
 * "doesn't exist" and "exists but you can't see it" — same shape the
 * Phase 9B profile page uses for drafts.
 */
export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getNetworkUser();
  const posting = await getPostingById(id, viewer?.id);
  if (!posting) notFound();

  const isOwner = viewer && String(viewer.id) === String(posting.ownerId);
  const connectionState = viewer && !isOwner ? await getConnectionState(viewer.id, posting.ownerId) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Opportunities", path: "/network/opportunities/" },
              { name: posting.title, path: `/network/opportunities/${id}/` },
            ]),
          ),
        }}
      />

      <Breadcrumb items={[{ name: "Opportunities", href: "/network/opportunities" }, { name: posting.title }]} />

      <Section surface="white">
        <div className="flex items-center gap-2">
          <Badge variant={posting.postingType === "offer" ? "petrol" : "neutral"}>
            {posting.postingType === "offer" ? "Offer" : "Need"}
          </Badge>
          {posting.status !== "active" && <Badge variant="ink">{posting.status}</Badge>}
        </div>
        <h1 className="font-display mt-4 max-w-3xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          {posting.title}
        </h1>
        <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">{posting.description}</p>

        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-[13px] text-n500">
          <div>
            <dt className="inline font-semibold text-n700">Posted by: </dt>
            <dd className="inline">{posting.ownerName}</dd>
          </div>
          {posting.category && (
            <div>
              <dt className="inline font-semibold text-n700">Category: </dt>
              <dd className="inline">{posting.category}</dd>
            </div>
          )}
          {posting.location && (
            <div>
              <dt className="inline font-semibold text-n700">Location: </dt>
              <dd className="inline">{posting.location}</dd>
            </div>
          )}
          {posting.budgetRange && (
            <div>
              <dt className="inline font-semibold text-n700">Budget: </dt>
              <dd className="inline">{posting.budgetRange}</dd>
            </div>
          )}
        </dl>

        <div className="mt-8">
          {isOwner ? (
            <p className="text-[13px] text-n500">This is your own posting — manage it from your dashboard.</p>
          ) : !viewer ? (
            <p className="text-[13px] text-n500">
              <Link href="/login" className="font-semibold text-petrol">
                Log in
              </Link>{" "}
              to respond to this posting.
            </p>
          ) : posting.status !== "active" ? (
            <p className="text-[13px] text-n500">This posting is no longer active.</p>
          ) : connectionState ? (
            <ConnectionStatusNote status={connectionState.status} requestedByViewer={connectionState.requestedByViewer} />
          ) : (
            <RespondToPostingButton postingId={posting.id} />
          )}
        </div>
      </Section>
    </>
  );
}
