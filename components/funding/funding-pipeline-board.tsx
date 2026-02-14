"use client";

import { FundingStatus } from "@prisma/client";
import { useMemo, useState } from "react";
import { fundingStatusLabels, fundingStatusOrder } from "@/lib/constants";
import { followUpLabel, formatDate } from "@/lib/date";
import { FundingLeadWithDrafts } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FundingClusterBadge } from "./funding-cluster-badge";
import { FundingFundTypeBadge } from "./funding-fund-type-badge";
import { FundingPriorityBadge } from "./funding-priority-badge";

type FundingPipelineBoardProps = {
  leads: FundingLeadWithDrafts[];
  onMoveStatus: (leadId: string, status: FundingStatus) => void;
  onOpenLead: (leadId: string) => void;
};

function ticketRange(lead: FundingLeadWithDrafts) {
  if (lead.ticketMin && lead.ticketMax) {
    return `${lead.ticketMin.toLocaleString("de-DE")} - ${lead.ticketMax.toLocaleString("de-DE")} ${lead.currency}`;
  }
  if (lead.ticketMin) return `ab ${lead.ticketMin.toLocaleString("de-DE")} ${lead.currency}`;
  if (lead.ticketMax) return `bis ${lead.ticketMax.toLocaleString("de-DE")} ${lead.currency}`;
  return "-";
}

export function FundingPipelineBoard({ leads, onMoveStatus, onOpenLead }: FundingPipelineBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<FundingStatus, FundingLeadWithDrafts[]> = {
      NEW: [],
      RESEARCHED: [],
      WARM_INTRO: [],
      CONTACTED: [],
      MEETING_BOOKED: [],
      IN_PROCESS_DD: [],
      WON: [],
      LOST: [],
    };

    leads.forEach((lead) => {
      map[lead.status].push(lead);
    });

    fundingStatusOrder.forEach((status) => {
      map[status].sort((a, b) => b.priority - a.priority);
    });

    return map;
  }, [leads]);

  function handleDrop(status: FundingStatus) {
    if (!draggedLeadId) return;
    onMoveStatus(draggedLeadId, status);
    setDraggedLeadId(null);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {fundingStatusOrder.map((status) => (
        <Card
          key={status}
          className="min-h-[220px]"
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDrop(status)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              {fundingStatusLabels[status]}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{grouped[status].length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {grouped[status].length === 0 ? (
              <p className="text-xs text-muted-foreground">Keine Leads in dieser Stufe.</p>
            ) : (
              grouped[status].map((lead) => {
                const effectiveCluster = lead.fitClusterOverride ?? lead.fitCluster;
                return (
                  <button
                    key={lead.id}
                    type="button"
                    className="rounded-md border border-border/80 bg-background/50 p-3 text-left"
                    draggable
                    onDragStart={() => setDraggedLeadId(lead.id)}
                    onClick={() => onOpenLead(lead.id)}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <FundingPriorityBadge score={lead.fitScore} priority={lead.priority} />
                      <FundingFundTypeBadge fundType={lead.fundType} />
                      <FundingClusterBadge cluster={effectiveCluster} />
                    </div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.primaryContactName || "Kein Kontakt"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Stage Fit: {lead.stageMatch}/3</p>
                    <p className="text-xs text-muted-foreground">Ticket: {ticketRange(lead)}</p>
                    <p className="text-xs text-muted-foreground">Country/Geo: {(lead.geoFocus[0] || lead.category || "-").toString()}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Next Follow-up: {formatDate(lead.nextFollowUpAt)}</p>
                    <p className="text-xs text-muted-foreground">{followUpLabel(lead.nextFollowUpAt)}</p>
                    {lead.warmIntroPossible ? (
                      <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">Warm Intro</p>
                    ) : null}
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
