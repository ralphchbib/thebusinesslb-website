import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getNetworkUser } from "@/lib/network/session";
import { getIncomingPendingConnections, getOutgoingPendingConnections, getAcceptedConnections, type ConnectionType } from "@/lib/network/messaging";
import { ConnectionResponseButtons } from "@/components/network/connection-response-buttons";

export const metadata: Metadata = { title: "Connections" };

const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  supplier: "My Suppliers",
  "service-provider": "My Service Providers",
  "business-partner": "My Business Partners",
  customer: "My Customers",
  "project-team": "My Project Team",
  mentor: "My Mentors",
  preferred: "My Preferred Businesses",
  alumni: "My Alumni Network",
  "local-community": "My Local Business Community",
};

export default async function ConnectionsPage() {
  const user = await getNetworkUser();
  if (!user) redirect("/login");

  const [incoming, outgoing, accepted] = await Promise.all([
    getIncomingPendingConnections(user.id),
    getOutgoingPendingConnections(user.id),
    getAcceptedConnections(user.id),
  ]);

  const acceptedGroups = Object.entries(accepted).filter(([, items]) => items.length > 0) as [ConnectionType, (typeof accepted)[ConnectionType]][];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-n200 bg-white p-8">
        <h1 className="font-display text-2xl font-medium text-ink">Connections</h1>
        <p className="mt-1 text-[13px] text-n500">
          Blueprint §34 Business Circles — confirmed commercial relationships. Every connection is a purposeful introduction, accepted by both sides.
        </p>
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Requests waiting on you ({incoming.length})</h2>
        {incoming.length === 0 ? (
          <p className="mt-3 text-[13px] text-n500">No pending requests.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {incoming.map((req) => (
              <div key={req.id} className="rounded-md border border-n200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-ink">{req.counterpart.name}</span>
                  <span className="text-[12px] text-n500">{CONNECTION_TYPE_LABELS[req.connectionType]}</span>
                </div>
                <dl className="mt-2 flex flex-col gap-1 text-[13px] text-n600">
                  <div><dt className="inline font-semibold text-n700">Reason: </dt><dd className="inline">{req.reason}</dd></div>
                  <div><dt className="inline font-semibold text-n700">Value offered: </dt><dd className="inline">{req.valueOffered}</dd></div>
                  <div><dt className="inline font-semibold text-n700">Expected outcome: </dt><dd className="inline">{req.expectedOutcome}</dd></div>
                </dl>
                <div className="mt-3">
                  <ConnectionResponseButtons connectionId={req.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">Requests you&rsquo;ve sent ({outgoing.length})</h2>
        {outgoing.length === 0 ? (
          <p className="mt-3 text-[13px] text-n500">No outgoing requests pending.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {outgoing.map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-md border border-n200 p-4">
                <span className="text-[14px] font-medium text-ink">{req.counterpart.name}</span>
                <span className="text-[12px] text-n500">{CONNECTION_TYPE_LABELS[req.connectionType]} · Pending</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-n200 bg-white p-8">
        <h2 className="font-display text-xl font-medium text-ink">My Circles</h2>
        {acceptedGroups.length === 0 ? (
          <p className="mt-3 text-[13px] text-n500">No confirmed connections yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            {acceptedGroups.map(([type, items]) => (
              <div key={type}>
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-n500">{CONNECTION_TYPE_LABELS[type]}</h3>
                <div className="mt-2 flex flex-col gap-2">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-md border border-n200 p-3 text-[14px] text-ink">
                      {item.counterpart.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
