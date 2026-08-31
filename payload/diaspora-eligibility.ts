import type { PayloadRequest } from "payload";

/**
 * Phase 18B — PHASE18B-TECHNICAL-DESIGN.md §C: server-side validation that
 * the *acting account's own* `accountType` is eligible to declare at all
 * (business/professional/diaspora — institution and consumer are not), and
 * that every value it submitted in `declarations` belongs to the option set
 * its own side is allowed to use. Same "never trust a client-supplied
 * claim, validate server-side" idiom `payload/institution-eligibility.ts`
 * established, applied here to the account's own eligibility rather than a
 * referenced document's.
 */

export const SUPPLY_SIDE_DECLARATIONS = [
  "seeking-buyers",
  "seeking-distributors",
  "export-ready",
  "seeking-mentors",
  "open-to-partnerships",
  "available-remote",
] as const;

export const DIASPORA_SIDE_DECLARATIONS = [
  "can-mentor",
  "can-distribute",
  "can-introduce-buyers",
  "looking-for-suppliers",
  "want-hire-lebanese-talent",
  "want-discover-products",
] as const;

export type SupplySideDeclaration = (typeof SUPPLY_SIDE_DECLARATIONS)[number];
export type DiasporaSideDeclaration = (typeof DIASPORA_SIDE_DECLARATIONS)[number];

export async function assertDeclarationEligibility(params: {
  req: PayloadRequest;
  accountId: unknown;
  declarations: unknown;
}): Promise<void> {
  if (params.accountId == null || params.accountId === "") {
    throw new Error("The account is required.");
  }
  const id = typeof params.accountId === "object" ? (params.accountId as { value?: unknown }).value : params.accountId;
  const doc = await params.req.payload
    .findByID({ collection: "network-accounts", id: id as string | number, depth: 0, overrideAccess: true, req: params.req })
    .catch(() => null);
  const accountType = doc?.accountType as string | undefined;
  if (!doc || !accountType || !["business", "professional", "diaspora"].includes(accountType)) {
    throw new Error("Only business, professional, or diaspora accounts can declare on the Diaspora Bridge.");
  }

  const values = Array.isArray(params.declarations) ? (params.declarations as unknown[]).map(String) : [];
  const allowedSet: readonly string[] = accountType === "diaspora" ? DIASPORA_SIDE_DECLARATIONS : SUPPLY_SIDE_DECLARATIONS;
  const invalid = values.filter((v) => !allowedSet.includes(v));
  if (invalid.length > 0) {
    throw new Error(
      accountType === "diaspora"
        ? "A diaspora account can only select diaspora-side declarations (what you can offer or are looking for)."
        : "A business or professional account can only select supply-side declarations (what you're seeking or offering).",
    );
  }
}
