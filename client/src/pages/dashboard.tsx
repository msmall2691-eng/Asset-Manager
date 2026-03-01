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
  preferredDate: string | null;
  status: string;
  createdAt: string;
};

type Quote = {
  id: string;
  leadId: string;
  totalCents: number;
  status: "draft" | "sent" | "accepted" | "declined";
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

  const quotes = useQuery<{ quotes: Quote[] }>({
    queryKey: ["/api/quotes"],
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

  const latestLeads = (leads.data?.leads ?? []).slice(0, 6);

  const quotesByLead = useMemo(() => {
    return new Map((quotes.data?.quotes ?? []).map((quote) => [quote.leadId, quote]));
  }, [quotes.data]);

  const schedulingRequests = useMemo(() => {
    return (leads.data?.leads ?? [])
      .filter((lead) => lead.status === "new" && !!lead.preferredDate)
      .slice(0, 5);
  }, [leads.data]);

  const leadCommunicationQueue = useMemo(() => {
    return (leads.data?.leads ?? [])
      .filter((lead) => lead.status === "new" || lead.status === "contacted")
      .slice(0, 5);
  }, [leads.data]);

  const quoteFollowUps = useMemo(() => {
    return (quotes.data?.quotes ?? []).filter((quote) => quote.status === "draft" || quote.status === "sent");
  }, [quotes.data]);

  const connected = health.data?.ok === true;
  const leadsCount = leads.data?.leads.length ?? 0;
  const visitsCount = visits.data?.visits.length ?? 0;
  const quoteCount = quotes.data?.quotes.length ?? 0;

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

      <section className="grid gap-4 md:grid-cols-4">
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
          <h2 className="text-sm font-medium text-muted-foreground">Quotes created</h2>
          <p className="mt-2 text-3xl font-semibold">{quoteCount}</p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium text-muted-foreground">Visits scheduled</h2>
          <p className="mt-2 text-3xl font-semibold">{visitsCount}</p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Workflow queue (what needs action now)</h2>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium">Scheduling requests waiting for reply</h3>
              <p className="text-xs text-muted-foreground">
                New leads with a preferred date usually expect a same-day response.
              </p>
              <div className="mt-2 space-y-2">
                {schedulingRequests.map((lead) => (
                  <div key={lead.id} className="rounded border p-2 text-sm">
                    <p className="font-medium">{lead.customerName}</p>
                    <p className="text-muted-foreground">
                      Requested: {lead.preferredDate} • {lead.propertyAddress ?? "Address missing"}
                    </p>
                  </div>
                ))}
                {schedulingRequests.length === 0 && (
                  <p className="text-sm text-muted-foreground">No pending schedule requests.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium">Quotes to send / follow up</h3>
              <div className="mt-2 space-y-2">
                {quoteFollowUps.slice(0, 5).map((quote) => (
                  <div key={quote.id} className="rounded border p-2 text-sm">
                    <p className="font-medium">Quote {quote.id.slice(0, 8)}</p>
                    <p className="text-muted-foreground">
                      Status: {quote.status} • ${(quote.totalCents / 100).toFixed(2)}
                    </p>
                  </div>
                ))}
                {quoteFollowUps.length === 0 && (
                  <p className="text-sm text-muted-foreground">No quote follow-ups pending.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium">Leads that need communication</h3>
              <div className="mt-2 space-y-2">
                {leadCommunicationQueue.map((lead) => (
                  <div key={lead.id} className="rounded border p-2 text-sm">
                    <p className="font-medium">{lead.customerName}</p>
                    <p className="text-muted-foreground">
                      {lead.customerPhone ?? lead.customerEmail ?? "No contact info"} • {lead.status}
                    </p>
                  </div>
                ))}
                {leadCommunicationQueue.length === 0 && (
                  <p className="text-sm text-muted-foreground">No pending lead conversations.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold">Latest intake leads</h2>
          <div className="mt-4 space-y-3">
            {latestLeads.map((lead) => (
              <div key={lead.id} className="rounded border p-3">
                <p className="font-medium">{lead.customerName}</p>
                <p className="text-sm text-muted-foreground">
                  {lead.propertyAddress ?? "No address provided"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: {lead.status} • Service: {lead.serviceType ?? "n/a"}
                  {quotesByLead.has(lead.id) ? " • Quote created" : " • No quote yet"}
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
      </section>

      <section className="mt-8 rounded-lg border bg-card p-4">
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
                  <td className="px-3 py-2">{new Date(visit.scheduledStart).toLocaleString()}</td>
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
      </section>
    </main>
  );
}
