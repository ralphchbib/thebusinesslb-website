import type { Where } from "payload";
import { getCms } from "@/lib/cms/client";
import type { CrmLeadStage } from "./crm-actions";

/**
 * Phase 16 — read-side data helpers for CRM Lite dashboard pages
 * (PHASE16-TECHNICAL-DESIGN.md §L). Every function here scopes to
 * `owner: ownerId` with `overrideAccess: true` (server-only, the caller —
 * always a dashboard page that already resolved the logged-in account via
 * `getNetworkUser()` — supplies the id), the same "resolve via Local API,
 * scoped by the already-authenticated viewer's own id" shape
 * `lib/network/messaging.ts` already established.
 */

export interface CrmContactSummary {
  id: string | number;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  source: string;
  leadCount: number;
  createdAt: string;
}

export async function getCrmContacts(ownerId: string | number): Promise<CrmContactSummary[]> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "crm-contacts",
    where: { owner: { equals: ownerId } },
    sort: "-createdAt",
    depth: 0,
    limit: 200,
    overrideAccess: true,
  });
  const contacts = await Promise.all(
    result.docs.map(async (doc) => {
      const leads = await payload.find({
        collection: "crm-leads",
        where: { contact: { equals: doc.id } },
        limit: 0,
        depth: 0,
        overrideAccess: true,
      });
      return {
        id: doc.id as string | number,
        name: doc.name as string,
        email: (doc.email as string) || null,
        phone: (doc.phone as string) || null,
        companyName: (doc.companyName as string) || null,
        source: doc.source as string,
        leadCount: leads.totalDocs,
        createdAt: doc.createdAt as string,
      };
    }),
  );
  return contacts;
}

export async function getCrmContact(ownerId: string | number, contactId: string | number): Promise<CrmContactSummary | null> {
  const payload = await getCms();
  const doc = await payload.findByID({ collection: "crm-contacts", id: contactId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!doc || String(doc.owner) !== String(ownerId)) return null;
  return {
    id: doc.id as string | number,
    name: doc.name as string,
    email: (doc.email as string) || null,
    phone: (doc.phone as string) || null,
    companyName: (doc.companyName as string) || null,
    source: doc.source as string,
    leadCount: 0,
    createdAt: doc.createdAt as string,
  };
}

export interface CrmLeadSummary {
  id: string | number;
  title: string;
  stage: CrmLeadStage;
  estimatedValue: number | null;
  contact: { id: string | number; name: string };
  updatedAt: string;
}

const PIPELINE_STAGES: CrmLeadStage[] = ["new", "qualified", "contacted", "proposal-sent", "negotiating", "won", "lost"];

export async function getCrmPipeline(ownerId: string | number): Promise<Record<CrmLeadStage, CrmLeadSummary[]>> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "crm-leads",
    where: { owner: { equals: ownerId } },
    sort: "-updatedAt",
    depth: 1,
    limit: 500,
    overrideAccess: true,
  });
  const grouped: Record<string, CrmLeadSummary[]> = {};
  for (const stage of PIPELINE_STAGES) grouped[stage] = [];
  for (const doc of result.docs) {
    const contact = doc.contact as { id?: unknown; name?: string } | number | string;
    const stage = doc.stage as CrmLeadStage;
    if (!grouped[stage]) grouped[stage] = [];
    grouped[stage].push({
      id: doc.id as string | number,
      title: doc.title as string,
      stage,
      estimatedValue: (doc.estimatedValue as number) ?? null,
      contact: {
        id: typeof contact === "object" ? ((contact.id ?? "") as string | number) : contact,
        name: typeof contact === "object" ? ((contact.name as string) ?? "Unknown") : "Unknown",
      },
      updatedAt: doc.updatedAt as string,
    });
  }
  return grouped as Record<CrmLeadStage, CrmLeadSummary[]>;
}

export async function getCrmLeadsForContact(ownerId: string | number, contactId: string | number): Promise<CrmLeadSummary[]> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "crm-leads",
    where: { and: [{ owner: { equals: ownerId } }, { contact: { equals: contactId } }] },
    sort: "-updatedAt",
    depth: 0,
    overrideAccess: true,
  });
  return result.docs.map((doc) => ({
    id: doc.id as string | number,
    title: doc.title as string,
    stage: doc.stage as CrmLeadStage,
    estimatedValue: (doc.estimatedValue as number) ?? null,
    contact: { id: contactId, name: "" },
    updatedAt: doc.updatedAt as string,
  }));
}

export interface CrmLeadDetail {
  id: string | number;
  title: string;
  stage: CrmLeadStage;
  estimatedValue: number | null;
  lostReason: string | null;
  closedAt: string | null;
  contact: CrmContactSummary;
}

export async function getCrmLead(ownerId: string | number, leadId: string | number): Promise<CrmLeadDetail | null> {
  const payload = await getCms();
  const doc = await payload.findByID({ collection: "crm-leads", id: leadId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!doc || String(doc.owner) !== String(ownerId)) return null;
  const contact = await getCrmContact(ownerId, doc.contact as string | number);
  if (!contact) return null;
  return {
    id: doc.id as string | number,
    title: doc.title as string,
    stage: doc.stage as CrmLeadStage,
    estimatedValue: (doc.estimatedValue as number) ?? null,
    lostReason: (doc.lostReason as string) || null,
    closedAt: (doc.closedAt as string) || null,
    contact,
  };
}

export interface CrmActivityEntry {
  id: string | number;
  entryType: "note" | "stage-change" | "system";
  body: string;
  lead: string | number | null;
  createdAt: string;
}

/** The Contact Timeline (PHASE16-TECHNICAL-DESIGN.md §C) — every entry for a contact, across the contact itself and every lead ever opened against it, newest first. */
export async function getCrmContactTimeline(ownerId: string | number, contactId: string | number): Promise<CrmActivityEntry[]> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "crm-activity",
    where: { and: [{ owner: { equals: ownerId } }, { contact: { equals: contactId } }] },
    sort: "-createdAt",
    depth: 0,
    limit: 200,
    overrideAccess: true,
  });
  return result.docs.map((doc) => ({
    id: doc.id as string | number,
    entryType: doc.entryType as CrmActivityEntry["entryType"],
    body: doc.body as string,
    lead: (doc.lead as string | number) ?? null,
    createdAt: doc.createdAt as string,
  }));
}

export interface CrmTaskItem {
  id: string | number;
  title: string;
  dueAt: string;
  status: "open" | "done" | "dismissed";
  contact: { id: string | number; name: string } | null;
  lead: { id: string | number; title: string } | null;
}

export async function getCrmOpenTasks(ownerId: string | number): Promise<CrmTaskItem[]> {
  const payload = await getCms();
  const result = await payload.find({
    collection: "crm-tasks",
    where: { and: [{ owner: { equals: ownerId } }, { status: { equals: "open" } }] },
    sort: "dueAt",
    depth: 1,
    limit: 200,
    overrideAccess: true,
  });
  return result.docs.map((doc) => {
    const contact = doc.contact as { id?: unknown; name?: string } | number | string | null;
    const lead = doc.lead as { id?: unknown; title?: string } | number | string | null;
    return {
      id: doc.id as string | number,
      title: doc.title as string,
      dueAt: doc.dueAt as string,
      status: doc.status as CrmTaskItem["status"],
      contact: contact ? { id: typeof contact === "object" ? ((contact.id ?? "") as string | number) : contact, name: typeof contact === "object" ? ((contact.name as string) ?? "") : "" } : null,
      lead: lead ? { id: typeof lead === "object" ? ((lead.id ?? "") as string | number) : lead, title: typeof lead === "object" ? ((lead.title as string) ?? "") : "" } : null,
    };
  });
}

export async function getCrmTasksFor(ownerId: string | number, params: { contactId?: string | number; leadId?: string | number }): Promise<CrmTaskItem[]> {
  const payload = await getCms();
  const and: Where[] = [{ owner: { equals: ownerId } }];
  if (params.contactId) and.push({ contact: { equals: params.contactId } });
  if (params.leadId) and.push({ lead: { equals: params.leadId } });
  const result = await payload.find({
    collection: "crm-tasks",
    where: { and },
    sort: "dueAt",
    depth: 0,
    overrideAccess: true,
  });
  return result.docs.map((doc) => ({
    id: doc.id as string | number,
    title: doc.title as string,
    dueAt: doc.dueAt as string,
    status: doc.status as CrmTaskItem["status"],
    contact: null,
    lead: null,
  }));
}

export interface CrmPipelineStats {
  countByStage: Record<CrmLeadStage, number>;
  winRate: number | null;
}

export async function getCrmPipelineStats(ownerId: string | number): Promise<CrmPipelineStats> {
  const pipeline = await getCrmPipeline(ownerId);
  const countByStage = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, pipeline[s]?.length ?? 0])) as Record<CrmLeadStage, number>;
  const closed = countByStage.won + countByStage.lost;
  const winRate = closed > 0 ? countByStage.won / closed : null;
  return { countByStage, winRate };
}
