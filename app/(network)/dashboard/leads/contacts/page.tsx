import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getCrmContacts } from "@/lib/network/crm";
import { AddContactForm } from "@/components/network/crm/add-contact-form";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "CRM Contacts" };

const SOURCE_LABELS: Record<string, string> = {
  "network-connection": "Network Connection",
  "market-posting": "Market Posting",
  manual: "Manual",
  referral: "Referral",
  other: "Other",
};

/** PHASE16-TECHNICAL-DESIGN.md §C/§D — the durable address book, independent of any open pursuit. */
export default async function CrmContactsPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");
  if (user.accountType !== "business") redirect("/dashboard");

  const contacts = await getCrmContacts(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Contacts</h1>
        <p className="mt-1 text-[13px] text-n500">Your CRM address book — Network members and manually-added contacts alike.</p>
      </div>

      <AddContactForm />

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">All contacts ({contacts.length})</h2>
        {contacts.length === 0 ? (
          <p className="mt-3 text-[13px] text-n500">No contacts yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {contacts.map((contact) => (
              <Link
                key={contact.id}
                href={`/dashboard/leads/contacts/${contact.id}`}
                className="flex items-center justify-between rounded-md border border-n200 p-4 hover:border-petrol"
              >
                <div>
                  <p className="text-[14px] font-medium text-ink">{contact.name}</p>
                  <p className="text-[12px] text-n500">{contact.companyName || contact.email || contact.phone || "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{SOURCE_LABELS[contact.source] ?? contact.source}</Badge>
                  <span className="text-[12px] text-n500">{contact.leadCount} lead{contact.leadCount === 1 ? "" : "s"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
