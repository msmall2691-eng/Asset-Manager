import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

type HealthResponse = {
  ok: boolean;
  service: string;
};

type Lead = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  propertyAddress: string | null;
  serviceType: string | null;
  status: string;
  createdAt: string;
};

type Visit = {
  id: string;
  jobId: string;
  scheduledStart: string;
  scheduledEnd: string;
  assignedCleanerIds: string[];
  status: string;
};

export default function Dashboard() {
  const health = useQuery<HealthResponse>({
    queryKey: ["/api/health"],
  });

  const leads = useQuery<{ leads: Lead[] }>({
    queryKey: ["/api/leads"],
  });

  const visits = useQuery<{ visits: Visit[] }>({
    queryKey: ["/api/visits"],
  });

  const upcomingVisits = useMemo(() => {
    const now = Date.now();
    const allVisits = visits.data?.visits ?? [];

    return allVisits
      .filter((visit) => new Date(visit.scheduledStart).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime(),
      )
      .slice(0, 8);
  }, [visits.data]);

  const connected = health.data?.ok === true;
  const leadsCount = leads.data?.leads.length ?? 0;
  const visitsCount = visits.data?.visits.length ?? 0;

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Elite Ops Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Intake + scheduling command center. Connect your intake website webhook to
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-sm">POST /api/leads</code>
          using the
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-sm">X-WEBHOOK-SECRET</code>
          header.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium text-muted-foreground">Backend status</h2>
          <p className="mt-2 text-lg font-semibold">
            {health.isLoading ? "Checking…" : connected ? "Connected ✅" : "Disconnected ❌"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {health.data?.service ?? health.error?.message ?? "No response"}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium text-muted-foreground">Leads received</h2>
          <p className="mt-2 text-3xl font-semibold">{leadsCount}</p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium text-muted-foreground">Visits scheduled</h2>
          <p className="mt-2 text-3xl font-semibold">{visitsCount}</p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Latest intake leads</h2>
          <div className="mt-4 space-y-3">
            {(leads.data?.leads ?? []).slice(0, 6).map((lead) => (
              <div key={lead.id} className="rounded border p-3">
                <p className="font-medium">{lead.customerName}</p>
                <p className="text-sm text-muted-foreground">
                  {lead.propertyAddress ?? "No address provided"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: {lead.status} • Service: {lead.serviceType ?? "n/a"}
                </p>
              </div>
            ))}
            {!leads.isLoading && (leads.data?.leads.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">
                No leads yet. Send a webhook from mainecleaning.company to populate this.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Schedule (Jobber-style quick view)</h2>
          <div className="mt-4 overflow-hidden rounded border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">End</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Crew</th>
                </tr>
              </thead>
              <tbody>
                {upcomingVisits.map((visit) => (
                  <tr key={visit.id} className="border-t">
                    <td className="px-3 py-2">
                      {new Date(visit.scheduledStart).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{new Date(visit.scheduledEnd).toLocaleString()}</td>
                    <td className="px-3 py-2 capitalize">{visit.status.replace("_", " ")}</td>
                    <td className="px-3 py-2">
                      {visit.assignedCleanerIds.length > 0
                        ? visit.assignedCleanerIds.join(", ")
                        : "Unassigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visits.isLoading && upcomingVisits.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">No upcoming visits scheduled.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
