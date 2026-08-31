import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeclarationById } from "@/lib/network/diaspora";
import { getNetworkUser } from "@/lib/network/session";
import { getConnectionState } from "@/lib/network/messaging";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema-org";
import { Breadcrumb } from "@/components/blocks/breadcrumb";
import { Section } from "@/components/blocks/section";
import { Badge } from "@/components/ui/badge";
import { RespondToDeclarationButton } from "@/components/network/respond-to-declaration-button";
import { ConnectionStatusNote } from "@/components/network/connect-button";
import { DECLARATION_LABELS } from "@/lib/network/diaspora-labels";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const declaration = await getDeclarationById(id);
  if (!declaration) return {};
  return buildMetadata({
    title: `${declaration.accountName} — Diaspora Bridge | THE BUSINESS lb`,
    description: declaration.note || `${declaration.accountName}'s Diaspora Bridge declaration.`,
    path: `/network/diaspora-bridge/${id}/`,
  });
}

/**
 * Blueprint §33 — a single declaration, with a Reach Out entry point that
 * reuses ConnectButton's exact structured-introduction UX
 * (PHASE18B-TECHNICAL-DESIGN.md §E), the same pattern the Opportunities
 * detail page already established for Market Postings responses.
 *
 * Opportunity Linking (INCLUDE #6) — a plain cross-link into the existing
 * /network/opportunities board, no schema change or category-mapping
 * logic (PHASE18B-TECHNICAL-DESIGN.md §M: "a cross-link... no schema
 * change"). Declaration values don't map cleanly 1:1 onto postings'
 * free-text `category` field, so this deliberately stays a plain link
 * rather than inventing a fragile mapping between the two.
 */
export default async function DeclarationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const declaration = await getDeclarationById(id);
  if (!declaration) notFound();

  const viewer = await getNetworkUser();
  const isOwner = viewer && String(viewer.id) === String(declaration.accountId);
  const connectionState = viewer && !isOwner ? await getConnectionState(viewer.id, declaration.accountId) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Diaspora Bridge", path: "/network/diaspora-bridge/" },
              { name: declaration.accountName, path: `/network/diaspora-bridge/${id}/` },
            ]),
          ),
        }}
      />

      <Breadcrumb items={[{ name: "Diaspora Bridge", href: "/network/diaspora-bridge" }, { name: declaration.accountName }]} />

      <Section surface="white">
        <div className="flex items-center gap-2">
          <Badge variant={declaration.accountType === "diaspora" ? "brass" : "petrol"}>
            {declaration.accountType === "diaspora" ? "Diaspora" : declaration.accountType === "professional" ? "Professional" : "Business"}
          </Badge>
          {declaration.diasporaCountry && <span className="text-[13px] text-n500">{declaration.diasporaCountry}</span>}
        </div>
        <h1 className="font-display mt-4 max-w-3xl text-[32px] font-medium tracking-[-0.02em] text-ink md:text-[44px]">
          {declaration.accountName}
        </h1>

        <div className="mt-5 flex flex-wrap gap-2">
          {declaration.declarations.map((d) => (
            <span key={d} className="rounded-pill bg-n100 px-3 py-1.5 text-[13px] font-medium text-n700">
              {DECLARATION_LABELS[d]}
            </span>
          ))}
        </div>

        {declaration.note && <p className="measure-lead mt-5 text-lg leading-relaxed text-n600">{declaration.note}</p>}

        <div className="mt-8">
          {isOwner ? (
            <p className="text-[13px] text-n500">This is your own declaration — manage it from your dashboard.</p>
          ) : !viewer ? (
            <p className="text-[13px] text-n500">
              <Link href="/login" className="font-semibold text-petrol">
                Log in
              </Link>{" "}
              to reach out.
            </p>
          ) : connectionState ? (
            <ConnectionStatusNote status={connectionState.status} requestedByViewer={connectionState.requestedByViewer} />
          ) : (
            <RespondToDeclarationButton declarationId={declaration.id} />
          )}
        </div>

        <div className="mt-6 border-t border-n200 pt-6">
          <Link href="/network/opportunities" className="text-[13px] font-semibold text-petrol">
            Browse related Opportunities →
          </Link>
        </div>
      </Section>
    </>
  );
}
