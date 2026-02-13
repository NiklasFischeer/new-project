import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { followUpLabel, formatDate } from "@/lib/date";
import { pipelineLabels } from "@/lib/constants";
import { getDashboardData } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  const pipelineSummary = Object.fromEntries(data.pipelineCounts.map((row) => [row.status, row._count.status]));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Focus this week on high-fit leads and pipeline momentum for federated learning pilots.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total leads</CardDescription>
            <CardTitle className="text-3xl">{data.counts}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Across all industries in your outreach database.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Open pipeline</CardDescription>
            <CardTitle className="text-3xl">{data.openPipeline}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Leads not yet marked won or lost.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Follow-ups this week</CardDescription>
            <CardTitle className="text-3xl">{data.followUpThisWeek.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Keep these moving to pilot discussion.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Stale leads</CardDescription>
            <CardTitle className="text-3xl">{data.staleLeads}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">No touchpoint in 21+ days or never contacted.</CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Top prioritized leads</CardTitle>
            <CardDescription>VC-style shortlist ranked by FL readiness and cooperation potential.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.topLeads.length === 0 ? (
              <EmptyState
                title="No leads yet"
                description="Start by adding target companies in the leads table."
                action={
                  <Button asChild>
                    <Link href="/leads">Add first lead</Link>
                  </Button>
                }
              />
            ) : (
              data.topLeads.map((lead) => (
                <div key={lead.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/80 p-3">
                  <div>
                    <p className="font-medium">{lead.companyName}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.industry} · {lead.contactName} ({lead.contactRole})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={lead.priorityLabel >= 4 ? "success" : lead.priorityLabel === 3 ? "warning" : "secondary"}>
                      Priority {lead.priorityLabel}/5
                    </Badge>
                    <Badge variant="outline">Score {lead.priorityScore}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Leads needing follow-up this week</CardTitle>
            <CardDescription>Time-sensitive list for founder outreach sprints.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.followUpThisWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground">No follow-ups scheduled this week.</p>
            ) : (
              data.followUpThisWeek.map((lead) => (
                <div key={lead.id} className="rounded-md border border-border/80 p-3">
                  <p className="font-medium">{lead.companyName}</p>
                  <p className="text-xs text-muted-foreground">{pipelineLabels[lead.status]}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(lead.nextFollowUpAt)}</p>
                  <p className="text-xs text-muted-foreground">{followUpLabel(lead.nextFollowUpAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Pipeline status snapshot</CardTitle>
            <CardDescription>Quick view of stage distribution.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(pipelineLabels).map(([status, label]) => (
              <Badge key={status} variant="outline">
                {label}: {pipelineSummary[status] ?? 0}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
