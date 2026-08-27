import type { PayloadRequest } from "payload";

/**
 * Phase 16 — shared writer for CrmActivity, the same idiom as Phase 14's
 * `logModerationEvent` (payload/moderation-audit.ts): one function every
 * hook writes through, so a lead's Contact Timeline (PHASE16-TECHNICAL-
 * DESIGN.md §C/§F) is never missing an entry because some call site forgot
 * a field.
 *
 * `req` is forwarded and passed through to the nested create below so it
 * joins the SAME transaction as the lead/contact write that triggered it,
 * rather than opening a second, independent transaction on a separate
 * pooled connection — the exact gotcha `moderation-audit.ts` and
 * `VerificationRequests.ts` both already document and had to learn the
 * hard way (an FK violation when the parent row isn't visible yet because
 * the outer transaction hasn't committed).
 */
export type CrmActivityEntryType = "note" | "stage-change" | "system";

interface LogParams {
  req: PayloadRequest;
  owner: string | number;
  contact: string | number;
  lead?: string | number | null;
  entryType: CrmActivityEntryType;
  body: string;
}

export async function logCrmActivity(params: LogParams): Promise<void> {
  await params.req.payload.create({
    collection: "crm-activity",
    data: {
      owner: params.owner,
      contact: params.contact,
      lead: params.lead ?? undefined,
      entryType: params.entryType,
      body: params.body,
    },
    overrideAccess: true,
    req: params.req,
  });
}
