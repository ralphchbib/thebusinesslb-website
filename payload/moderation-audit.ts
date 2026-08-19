import type { PayloadRequest } from "payload";

/**
 * Phase 14 — shared writer for ModerationAuditLog, called from
 * ModerationCases' and Appeals' own hooks (never from client code). Kept
 * as one function so every write goes through the identical shape,
 * matching PHASE14-TECHNICAL-DESIGN.md §D.2's requirement that the log be
 * the one trustworthy record of what happened, independent of whatever
 * the mutable case/appeal record says later.
 */
export type ModerationAuditAction =
  | "case-opened"
  | "status-changed"
  | "decision-recorded"
  | "escalated"
  | "appeal-submitted"
  | "appeal-decided";

interface LogParams {
  // `req` is passed through and forwarded to the nested create below so
  // it joins the SAME transaction as the case/appeal write that triggered
  // it, rather than opening a second, independent transaction on a
  // separate pooled connection — confirmed live that omitting this causes
  // an FK violation (the case/appeal row this log entry references isn't
  // visible yet, since the outer transaction hasn't committed). Same
  // gotcha VerificationRequests.ts already documents for its own nested
  // write.
  req: PayloadRequest;
  case?: string | number | null;
  actorId?: string | number | null;
  action: ModerationAuditAction;
  fromValue?: string;
  toValue?: string;
  note?: string;
}

export async function logModerationEvent(params: LogParams): Promise<void> {
  await params.req.payload.create({
    collection: "moderation-audit-log",
    data: {
      case: params.case ?? undefined,
      actor: params.actorId ?? undefined,
      automated: params.actorId == null,
      action: params.action,
      fromValue: params.fromValue ?? "",
      toValue: params.toValue ?? "",
      note: params.note ?? "",
    },
    overrideAccess: true,
    req: params.req,
  });
}
