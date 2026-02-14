"use client";

import { PipelineStatus } from "@prisma/client";
import { useMemo, useState } from "react";
import { followUpLabel, formatDate } from "@/lib/date";
import { pipelineLabels, pipelineOrder } from "@/lib/constants";
import { LeadWithDrafts } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClusterBadge } from "./cluster-badge";
import { PriorityBadge } from "./priority-badge";

type LeadsPipelineBoardProps = {
  leads: LeadWithDrafts[];
  onMoveStatus: (leadId: string, status: PipelineStatus) => void;
  onOpenLead: (leadId: string) => void;
};

export function LeadsPipelineBoard({ leads, onMoveStatus, onOpenLead }: LeadsPipelineBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

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

  function handleDrop(status: PipelineStatus) {
    if (!draggedLeadId) return;
    onMoveStatus(draggedLeadId, status);
    setDraggedLeadId(null);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {pipelineOrder.map((status) => (
        <Card
          key={status}
          className="min-h-[220px]"
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDrop(status)}
        >
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
                <button
                  key={lead.id}
                  type="button"
                  className="rounded-md border border-border/80 bg-background/50 p-3 text-left"
                  draggable
                  onDragStart={() => setDraggedLeadId(lead.id)}
                  onClick={() => onOpenLead(lead.id)}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <PriorityBadge score={lead.priorityScore} label={lead.priorityLabel} />
                    <ClusterBadge cluster={lead.clusterOverride ?? lead.industryCluster} />
                  </div>
                  <p className="font-medium">{lead.companyName}</p>
                  <p className="text-xs text-muted-foreground">{lead.industry}</p>
                  <p className="text-xs text-muted-foreground">{lead.contactName || "-"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Follow-up: {formatDate(lead.nextFollowUpAt)}</p>
                  <p className="text-xs text-muted-foreground">{followUpLabel(lead.nextFollowUpAt)}</p>
                  {lead.warmIntroPossible ? (
                    <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">Warm Intro</p>
                  ) : null}
                </button>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
