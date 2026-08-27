"use server";

import { revalidatePath } from "next/cache";
import { getCms } from "@/lib/cms/client";
import { checkThrottle } from "@/lib/actions";
import { getNetworkUser } from "@/lib/network/session";
import { crmContactSchema, crmLeadSchema, crmNoteSchema, crmTaskSchema } from "@/lib/validation/crm-schemas";

export type CrmLeadStage = "new" | "qualified" | "contacted" | "proposal-sent" | "negotiating" | "won" | "lost";

export interface CrmFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

const initialErrorState = (message: string): CrmFormState => ({ status: "error", message });

/** Manual contact entry (PHASE16-TECHNICAL-DESIGN.md §H) — a person/business who may never have registered on the Network at all. */
export async function createCrmContactAction(_prev: CrmFormState, formData: FormData): Promise<CrmFormState> {
  const user = await getNetworkUser();
  if (!user) return initialErrorState("Your session has expired. Please log in again.");
  if (user.accountType !== "business") return initialErrorState("CRM Lite is available to business accounts.");

  const parsed = crmContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    companyName: formData.get("companyName"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const allowed = await checkThrottle("crm-contact-create");
  if (!allowed) return initialErrorState("Too many contacts added from this connection. Try again shortly.");

  const payload = await getCms();
  let contactId: string | number;
  try {
    const doc = await payload.create({
      collection: "crm-contacts",
      data: {
        owner: user.id,
        name: parsed.data.name,
        email: parsed.data.email || undefined,
        phone: parsed.data.phone || undefined,
        companyName: parsed.data.companyName || undefined,
        source: "manual",
      },
      user,
      overrideAccess: false,
    });
    contactId = doc.id as string | number;
  } catch (err) {
    console.error("[crm:contact:create:error]", err);
    return initialErrorState("Something went wrong. Please try again.");
  }

  revalidatePath("/dashboard/leads/contacts");
  return { status: "success", message: "Contact added.", fieldErrors: { contactId: String(contactId) } };
}

/**
 * "Add to CRM" (PHASE16-TECHNICAL-DESIGN.md §H) — promotes an accepted
 * Connection into a CrmContact + a first CrmLead, and sets
 * `Conversations.businessContacted = true` on the associated conversation
 * so the pre-CRM signal stays consistent (§I). Never automatic — this is
 * always an explicit owner action, reachable only from an `accepted`
 * connection the acting account is actually party to.
 */
export async function addConnectionToCrmAction(_prev: CrmFormState, formData: FormData): Promise<CrmFormState> {
  const user = await getNetworkUser();
  if (!user) return initialErrorState("Your session has expired. Please log in again.");
  if (user.accountType !== "business") return initialErrorState("CRM Lite is available to business accounts.");

  const connectionId = String(formData.get("connectionId") ?? "");
  if (!connectionId) return initialErrorState("Something went wrong. Please try again.");

  const payload = await getCms();
  const connection = await payload.findByID({ collection: "connections", id: connectionId, depth: 0, overrideAccess: true }).catch(() => null);
  if (!connection || connection.status !== "accepted") {
    return initialErrorState("That connection isn't available to add.");
  }
  const accountAId = typeof connection.accountA === "object" ? (connection.accountA as { id?: unknown })?.id : connection.accountA;
  const accountBId = typeof connection.accountB === "object" ? (connection.accountB as { id?: unknown })?.id : connection.accountB;
  const isParty = String(accountAId) === String(user.id) || String(accountBId) === String(user.id);
  if (!isParty) return initialErrorState("That connection isn't available to add.");
  const counterpartId = String(accountAId) === String(user.id) ? accountBId : accountAId;

  const counterpart = await payload.findByID({ collection: "network-accounts", id: counterpartId as string | number, depth: 0, overrideAccess: true }).catch(() => null);
  if (!counterpart) return initialErrorState("Something went wrong. Please try again.");

  // Reuse an existing contact for this network account if one already exists, rather than creating a duplicate on a second "Add to CRM" from a different connection with the same counterpart.
  const existing = await payload.find({
    collection: "crm-contacts",
    where: { and: [{ owner: { equals: user.id } }, { networkAccount: { equals: counterpartId } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  let contactId: string | number;
  try {
    if (existing.docs[0]) {
      contactId = existing.docs[0].id as string | number;
    } else {
      const source = connection.originPosting ? "market-posting" : "network-connection";
      const contactDoc = await payload.create({
        collection: "crm-contacts",
        data: {
          owner: user.id,
          networkAccount: counterpartId,
          name: (counterpart.name as string) || "Unknown",
          email: (counterpart.email as string) || undefined,
          source,
          originConnection: Number(connectionId),
        },
        user,
        overrideAccess: false,
      });
      contactId = contactDoc.id as string | number;
    }

    const leadDoc = await payload.create({
      collection: "crm-leads",
      data: {
        owner: user.id,
        contact: contactId,
        title: `${(counterpart.name as string) || "New contact"} — from Connections`,
        stage: "new",
      },
      user,
      overrideAccess: false,
    });

    const conversation = await payload.find({
      collection: "conversations",
      where: { connection: { equals: connectionId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (conversation.docs[0]) {
      await payload.update({
        collection: "conversations",
        id: conversation.docs[0].id,
        data: { businessContacted: true },
        overrideAccess: true,
      });
    }

    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard/leads/contacts");
    revalidatePath("/dashboard/connections");
    return { status: "success", message: "Added to your CRM pipeline.", fieldErrors: { leadId: String(leadDoc.id) } };
  } catch (err) {
    console.error("[crm:connection:add:error]", err);
    return initialErrorState("Something went wrong. Please try again.");
  }
}

/** A new lead against an existing contact (PHASE16-TECHNICAL-DESIGN.md §C — a repeat pursuit of the same contact). */
export async function createCrmLeadAction(_prev: CrmFormState, formData: FormData): Promise<CrmFormState> {
  const user = await getNetworkUser();
  if (!user) return initialErrorState("Your session has expired. Please log in again.");
  if (user.accountType !== "business") return initialErrorState("CRM Lite is available to business accounts.");

  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return initialErrorState("Something went wrong. Please try again.");

  const parsed = crmLeadSchema.safeParse({
    title: formData.get("title"),
    estimatedValue: formData.get("estimatedValue"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const allowed = await checkThrottle("crm-lead-create");
  if (!allowed) return initialErrorState("Too many leads created from this connection. Try again shortly.");

  const payload = await getCms();
  let leadId: string | number;
  try {
    const doc = await payload.create({
      collection: "crm-leads",
      data: {
        owner: user.id,
        contact: Number(contactId),
        title: parsed.data.title,
        stage: "new",
        estimatedValue: parsed.data.estimatedValue ? Number(parsed.data.estimatedValue) : undefined,
      },
      user,
      overrideAccess: false,
    });
    leadId = doc.id as string | number;
  } catch (err) {
    console.error("[crm:lead:create:error]", err);
    return initialErrorState("Something went wrong. Please try again.");
  }

  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/contacts/${contactId}`);
  return { status: "success", message: "Lead created.", fieldErrors: { leadId: String(leadId) } };
}

/** Stage transition (PHASE16-TECHNICAL-DESIGN.md §F). Terminal-state enforcement lives at the access-control layer (`crmLeadStageFieldAccess`) — this action just supplies a friendly error if that layer rejects it. */
export async function updateCrmLeadStageAction(_prev: CrmFormState, formData: FormData): Promise<CrmFormState> {
  const user = await getNetworkUser();
  if (!user) return initialErrorState("Your session has expired. Please log in again.");

  const leadId = String(formData.get("leadId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const lostReason = String(formData.get("lostReason") ?? "");
  const validStages: CrmLeadStage[] = ["new", "qualified", "contacted", "proposal-sent", "negotiating", "won", "lost"];
  if (!leadId || !validStages.includes(stage as CrmLeadStage)) {
    return initialErrorState("Something went wrong. Please try again.");
  }

  const payload = await getCms();
  try {
    await payload.update({
      collection: "crm-leads",
      id: leadId,
      data: { stage, lostReason: stage === "lost" ? lostReason || undefined : undefined },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    console.error("[crm:lead:stage:error]", err);
    return initialErrorState("That stage change isn't allowed — a Won or Lost lead can't be reopened.");
  }

  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${leadId}`);
  return { status: "success", message: "Stage updated." };
}

/** A note against a contact or a specific lead within it (PHASE16-TECHNICAL-DESIGN.md §D/§F). */
export async function addCrmNoteAction(_prev: CrmFormState, formData: FormData): Promise<CrmFormState> {
  const user = await getNetworkUser();
  if (!user) return initialErrorState("Your session has expired. Please log in again.");

  const contactId = String(formData.get("contactId") ?? "");
  const leadId = formData.get("leadId") ? String(formData.get("leadId")) : undefined;
  if (!contactId) return initialErrorState("Something went wrong. Please try again.");

  const parsed = crmNoteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const payload = await getCms();
  try {
    await payload.create({
      collection: "crm-activity",
      data: { owner: user.id, contact: Number(contactId), lead: leadId ? Number(leadId) : undefined, entryType: "note", body: parsed.data.body },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    console.error("[crm:note:create:error]", err);
    return initialErrorState("Something went wrong. Please try again.");
  }

  revalidatePath(`/dashboard/leads/contacts/${contactId}`);
  if (leadId) revalidatePath(`/dashboard/leads/${leadId}`);
  return { status: "success", message: "Note added." };
}

/** Follow-up task / reminder (PHASE16-TECHNICAL-DESIGN.md §D/§L). */
export async function createCrmTaskAction(_prev: CrmFormState, formData: FormData): Promise<CrmFormState> {
  const user = await getNetworkUser();
  if (!user) return initialErrorState("Your session has expired. Please log in again.");
  if (user.accountType !== "business") return initialErrorState("CRM Lite is available to business accounts.");

  const contactId = formData.get("contactId") ? String(formData.get("contactId")) : undefined;
  const leadId = formData.get("leadId") ? String(formData.get("leadId")) : undefined;
  if (!contactId && !leadId) return initialErrorState("Something went wrong. Please try again.");

  const parsed = crmTaskSchema.safeParse({ title: formData.get("title"), dueAt: formData.get("dueAt") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const allowed = await checkThrottle("crm-task-create");
  if (!allowed) return initialErrorState("Too many tasks created from this connection. Try again shortly.");

  const payload = await getCms();
  try {
    await payload.create({
      collection: "crm-tasks",
      data: { owner: user.id, contact: contactId ? Number(contactId) : undefined, lead: leadId ? Number(leadId) : undefined, title: parsed.data.title, dueAt: new Date(parsed.data.dueAt).toISOString(), status: "open" },
      user,
      overrideAccess: false,
    });
  } catch (err) {
    console.error("[crm:task:create:error]", err);
    return initialErrorState("Something went wrong. Please try again.");
  }

  revalidatePath("/dashboard/leads/tasks");
  if (contactId) revalidatePath(`/dashboard/leads/contacts/${contactId}`);
  if (leadId) revalidatePath(`/dashboard/leads/${leadId}`);
  return { status: "success", message: "Task added." };
}

/** Mark a task done or dismissed — the only two writes allowed against an existing task besides deletion. */
export async function updateCrmTaskStatusAction(_prev: CrmFormState, formData: FormData): Promise<CrmFormState> {
  const user = await getNetworkUser();
  if (!user) return initialErrorState("Your session has expired. Please log in again.");

  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!taskId || (status !== "done" && status !== "dismissed")) {
    return initialErrorState("Something went wrong. Please try again.");
  }

  const payload = await getCms();
  try {
    await payload.update({ collection: "crm-tasks", id: taskId, data: { status }, user, overrideAccess: false });
  } catch (err) {
    console.error("[crm:task:status:error]", err);
    return initialErrorState("Something went wrong. Please try again.");
  }

  revalidatePath("/dashboard/leads/tasks");
  return { status: "success", message: status === "done" ? "Task completed." : "Task dismissed." };
}

/** Owner-only hard delete — CRM Lite data is the owner's own private workspace, no counterpart relationship to protect (PHASE16-TECHNICAL-DESIGN.md §J). */
export async function deleteCrmContactAction(_prev: CrmFormState, formData: FormData): Promise<CrmFormState> {
  const user = await getNetworkUser();
  if (!user) return initialErrorState("Your session has expired. Please log in again.");
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return initialErrorState("Something went wrong. Please try again.");

  const payload = await getCms();
  try {
    await payload.delete({ collection: "crm-contacts", id: contactId, user, overrideAccess: false });
  } catch (err) {
    console.error("[crm:contact:delete:error]", err);
    return initialErrorState("Something went wrong. Please try again.");
  }
  revalidatePath("/dashboard/leads/contacts");
  return { status: "success", message: "Contact deleted." };
}

export async function deleteCrmLeadAction(_prev: CrmFormState, formData: FormData): Promise<CrmFormState> {
  const user = await getNetworkUser();
  if (!user) return initialErrorState("Your session has expired. Please log in again.");
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return initialErrorState("Something went wrong. Please try again.");

  const payload = await getCms();
  try {
    await payload.delete({ collection: "crm-leads", id: leadId, user, overrideAccess: false });
  } catch (err) {
    console.error("[crm:lead:delete:error]", err);
    return initialErrorState("Something went wrong. Please try again.");
  }
  revalidatePath("/dashboard/leads");
  return { status: "success", message: "Lead deleted." };
}
