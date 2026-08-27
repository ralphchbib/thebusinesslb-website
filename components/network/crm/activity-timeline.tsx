import type { CrmActivityEntry } from "@/lib/network/crm";

const ENTRY_STYLES: Record<CrmActivityEntry["entryType"], string> = {
  note: "border-petrol-tint bg-petrol-tint/40",
  "stage-change": "border-n200 bg-n50",
  system: "border-n200 bg-n50",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** PHASE16-TECHNICAL-DESIGN.md §C/§L — the Contact Timeline: manual notes and auto-logged stage-change/system entries, newest first, in one reverse-chronological feed. Purely presentational — the query lives in lib/network/crm.ts's getCrmContactTimeline. */
export function ActivityTimeline({ entries }: { entries: CrmActivityEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-[13px] text-n500">No activity yet.</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li key={entry.id} className={`rounded-md border p-3 text-[13px] ${ENTRY_STYLES[entry.entryType]}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">{entry.entryType === "note" ? "Note" : entry.entryType === "stage-change" ? "Stage change" : "System"}</span>
            <span className="text-[12px] text-n500">{formatDate(entry.createdAt)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-n700">{entry.body}</p>
        </li>
      ))}
    </ol>
  );
}
