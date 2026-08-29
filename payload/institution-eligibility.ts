import type { PayloadRequest } from "payload";

/**
 * Phase 18A — PHASE18-TECHNICAL-DESIGN.md §D: server-side validation that a
 * referenced `network-accounts` id actually has one of the expected
 * `accountType` values, before an `InstitutionMemberships` row is allowed
 * to reference it as the "institution" or "member" side. Same idiom as
 * `payload/crm-ownership.ts`'s `assertOwnedReference` (never trust a
 * client-supplied claim about another document — resolve it server-side),
 * but checking account *type* eligibility rather than *ownership* — a
 * different question, hence a separate helper rather than overloading
 * `assertOwnedReference` with a second, unrelated purpose.
 *
 * `req` IS forwarded to this `findByID` call, for the identical reason
 * `assertOwnedReference` forwards it: a hook created row (e.g. a future
 * `afterChange` side effect on `network-accounts` itself) could otherwise
 * be invisible to a lookup on a separate, non-joined connection within the
 * same request/transaction. No such write exists yet on `NetworkAccounts`
 * as of this phase, but forwarding `req` costs nothing and avoids
 * reintroducing the exact bug `payload/crm-ownership.ts`'s own header
 * documents having to learn the hard way.
 */
export async function assertAccountType(params: {
  req: PayloadRequest;
  accountId: unknown;
  allowedTypes: string[];
  fieldLabel: string;
}): Promise<void> {
  if (params.accountId == null || params.accountId === "") {
    throw new Error(`The ${params.fieldLabel} is required.`);
  }
  const id = typeof params.accountId === "object" ? (params.accountId as { value?: unknown }).value : params.accountId;
  const doc = await params.req.payload
    .findByID({ collection: "network-accounts", id: id as string | number, depth: 0, overrideAccess: true, req: params.req })
    .catch(() => null);
  if (!doc || !params.allowedTypes.includes(doc.accountType as string)) {
    throw new Error(`The ${params.fieldLabel} must be a(n) ${params.allowedTypes.join(" or ")} account.`);
  }
}
