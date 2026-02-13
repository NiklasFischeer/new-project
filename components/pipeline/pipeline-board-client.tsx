"use client";

import Link from "next/link";
import { PipelineStatus } from "@prisma/client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { followUpLabel, formatDate } from "@/lib/date";
import { pipelineLabels, pipelineOrder } from "@/lib/constants";
import { LeadWithDrafts } from "@/lib/types";
import { ClusterBadge } from "@/components/leads/cluster-badge";
import { PriorityBadge } from "@/components/leads/priority-badge";

type PipelineBoardClientProps = {
  initialLeads: LeadWithDrafts[];
};

export function PipelineBoardClient({ initialLeads }: PipelineBoardClientProps) {
  const [leads, setLeads] = useState(initialLeads);

  const grouped = useMemo(() => {
    const map: Record<PipelineStatus, LeadWithDrafts[]> = {
      NEW: [],
      CONTACTED: [],
      REPLIED: [],
      INTERVIEW: [],
      PILOT_CANDIDATE: [],
      PILOT_RUNNING: [],
      WON: [],
      LOST: [],
    };

    leads.forEach((lead) => {
      map[lead.status].push(lead);
    });

    pipelineOrder.forEach((status) => {
      map[status].sort((a, b) => b.priorityScore - a.priorityScore);
    });

    return map;
  }, [leads]);

  async function moveLead(leadId: string, status: PipelineStatus) {
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)));

    const response = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) return;

    const data = (await response.json()) as { lead: LeadWithDrafts };
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? data.lead : lead)));
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Pipeline</h1>
        <p className="text-sm text-muted-foreground">Move leads across stages from first contact to pilot close.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {pipelineOrder.map((status) => (
          <Card key={status} className="min-h-[220px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                {pipelineLabels[status]}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{grouped[status].length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {grouped[status].length === 0 ? (
                <p className="text-xs text-muted-foreground">No leads in this stage.</p>
              ) : (
                grouped[status].map((lead) => (
                  <div key={lead.id} className="rounded-md border border-border/80 bg-background/50 p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <PriorityBadge score={lead.priorityScore} label={lead.priorityLabel} />
                      <ClusterBadge cluster={lead.clusterOverride ?? lead.industryCluster} />
                    </div>
                    <p className="font-medium">{lead.companyName}</p>
                    <p className="text-xs text-muted-foreground">{lead.industry}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Follow-up: {formatDate(lead.nextFollowUpAt)}</p>
                    <p className="text-xs text-muted-foreground">{followUpLabel(lead.nextFollowUpAt)}</p>
                    <div className="mt-3 grid gap-2">
                      <Select
                        value={lead.status}
                        onChange={(event) => moveLead(lead.id, event.target.value as PipelineStatus)}
                        className="h-9 min-w-[10rem]"
                      >
                        {Object.entries(pipelineLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/leads">Open lead</Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
