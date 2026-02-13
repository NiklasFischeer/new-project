"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PipelineStatus } from "@prisma/client";
import { Plus, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { followUpLabel, formatDate } from "@/lib/date";
import { clusterLabel, pipelineLabels } from "@/lib/constants";
import { CustomFieldDefinitionRecord, LeadWithDrafts } from "@/lib/types";
import { ClusterBadge } from "./cluster-badge";
import { LeadDetailDrawer } from "./lead-detail-drawer";
import { NewLeadDialog } from "./new-lead-dialog";
import { PriorityBadge } from "./priority-badge";

type LeadsTableClientProps = {
  initialLeads: LeadWithDrafts[];
  initialCustomFields: CustomFieldDefinitionRecord[];
  initialQuery?: string;
};

type SortKey = "companyName" | "priorityScore" | "nextFollowUpAt" | "industry";

export function LeadsTableClient({ initialLeads, initialCustomFields, initialQuery = "" }: LeadsTableClientProps) {
  const [leads, setLeads] = useState<LeadWithDrafts[]>(initialLeads);
  const [customFields, setCustomFields] = useState<CustomFieldDefinitionRecord[]>(initialCustomFields);
  const [search, setSearch] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [clusterFilter, setClusterFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("priorityScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedLead, setSelectedLead] = useState<LeadWithDrafts | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();

    const base = leads.filter((lead) => {
      const effectiveCluster = lead.clusterOverride ?? lead.industryCluster;

      const matchesQuery =
        !query ||
        lead.companyName.toLowerCase().includes(query) ||
        lead.industry.toLowerCase().includes(query) ||
        lead.contactName.toLowerCase().includes(query) ||
        lead.contactEmail.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter;
      const matchesCluster = clusterFilter === "ALL" || effectiveCluster === clusterFilter;

      return matchesQuery && matchesStatus && matchesCluster;
    });

    return [...base].sort((a, b) => {
      let result = 0;
      if (sortKey === "priorityScore") {
        result = a.priorityScore - b.priorityScore;
      }

      if (sortKey === "companyName") {
        result = a.companyName.localeCompare(b.companyName);
      }

      if (sortKey === "industry") {
        result = a.industry.localeCompare(b.industry);
      }

      if (sortKey === "nextFollowUpAt") {
        result = new Date(a.nextFollowUpAt ?? 0).getTime() - new Date(b.nextFollowUpAt ?? 0).getTime();
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [clusterFilter, leads, search, sortDirection, sortKey, statusFilter]);

  const exportParams = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (clusterFilter !== "ALL") params.set("cluster", clusterFilter);
    return params.toString();
  }, [clusterFilter, search, statusFilter]);

  const matchCounts = useMemo(() => {
    const normalized = new Map(
      leads.map((lead) => [
        lead.id,
        new Set(lead.dataTypes.map((type) => type.trim().toLowerCase()).filter(Boolean)),
      ]),
    );

    const result = new Map<string, number>();
    leads.forEach((lead) => {
      const own = normalized.get(lead.id);
      if (!own || own.size === 0) {
        result.set(lead.id, 0);
        return;
      }

      let count = 0;
      leads.forEach((candidate) => {
        if (candidate.id === lead.id) return;
        const other = normalized.get(candidate.id);
        if (!other || other.size === 0) return;
        const shared = Array.from(own).some((item) => other.has(item));
        if (shared) count += 1;
      });
      result.set(lead.id, count);
    });

    return result;
  }, [leads]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "priorityScore" ? "desc" : "asc");
  }

  function updateLeadInState(updated: LeadWithDrafts) {
    setLeads((prev) => prev.map((lead) => (lead.id === updated.id ? updated : lead)));
    if (selectedLead?.id === updated.id) {
      setSelectedLead(updated);
    }
  }

  function updateLeadField(id: string, field: keyof LeadWithDrafts, value: unknown) {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== id) return lead;
        return {
          ...lead,
          [field]: value,
        };
      }),
    );
  }

  async function patchLead(id: string, payload: Record<string, unknown>) {
    const response = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) return;

    const data = (await response.json()) as { lead: LeadWithDrafts };
    updateLeadInState(data.lead);
  }

  async function deleteLead(id: string) {
    const response = await fetch(`/api/leads/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) return;

    setLeads((prev) => prev.filter((lead) => lead.id !== id));
    if (selectedLead?.id === id) {
      setSelectedLead(null);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">Smart outreach database with inline edits and fit scoring.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/api/leads/export${exportParams ? `?${exportParams}` : ""}`}>Export filtered CSV</Link>
          </Button>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add lead
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-border bg-card/70 p-4 md:grid-cols-4">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter leads..." />
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="ALL">All statuses</option>
          {Object.entries(pipelineLabels).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </Select>
        <Select value={clusterFilter} onChange={(event) => setClusterFilter(event.target.value)}>
          <option value="ALL">All fit clusters</option>
          <option value="HIGH">{clusterLabel.HIGH}</option>
          <option value="MEDIUM">{clusterLabel.MEDIUM}</option>
          <option value="LOW">{clusterLabel.LOW}</option>
        </Select>
        <div className="inline-flex items-center justify-end gap-2 rounded-md border border-border px-3 text-sm text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          {filteredLeads.length} visible
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <EmptyState
          title="No leads match your filters"
          description="Adjust filters or add a new lead to kick off outreach."
          action={<Button onClick={() => setCreateOpen(true)}>Create lead</Button>}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card/80">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button className="font-medium" onClick={() => toggleSort("companyName")}>Company</button>
                </TableHead>
                <TableHead>
                  <button className="font-medium" onClick={() => toggleSort("industry")}>Industry</button>
                </TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead>
                  <button className="font-medium" onClick={() => toggleSort("priorityScore")}>Priority</button>
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data types</TableHead>
                <TableHead>Matches</TableHead>
                <TableHead>
                  <button className="font-medium" onClick={() => toggleSort("nextFollowUpAt")}>Next follow-up</button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => {
                const effectiveCluster = lead.clusterOverride ?? lead.industryCluster;
                return (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Input
                        value={lead.companyName}
                        onChange={(event) => updateLeadField(lead.id, "companyName", event.target.value)}
                        onBlur={() => patchLead(lead.id, { companyName: lead.companyName })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={lead.industry}
                        onChange={(event) => updateLeadField(lead.id, "industry", event.target.value)}
                        onBlur={() => patchLead(lead.id, { industry: lead.industry })}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <ClusterBadge cluster={effectiveCluster} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge score={lead.priorityScore} label={lead.priorityLabel} />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={lead.contactEmail}
                        onChange={(event) => updateLeadField(lead.id, "contactEmail", event.target.value)}
                        onBlur={() => patchLead(lead.id, { contactEmail: lead.contactEmail })}
                        className="h-8"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">{lead.contactName}</p>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={lead.status}
                        onChange={(event) => {
                          const status = event.target.value as PipelineStatus;
                          updateLeadField(lead.id, "status", status);
                          void patchLead(lead.id, { status });
                        }}
                        className="h-9 min-w-[10rem]"
                      >
                        {Object.entries(pipelineLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      {lead.dataTypes.length === 0 ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <div className="flex max-w-56 flex-wrap gap-1">
                          {lead.dataTypes.slice(0, 3).map((type) => (
                            <Badge key={`${lead.id}-${type}`} variant="outline">
                              {type}
                            </Badge>
                          ))}
                          {lead.dataTypes.length > 3 ? <Badge variant="secondary">+{lead.dataTypes.length - 3}</Badge> : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={matchCounts.get(lead.id) ? "success" : "secondary"}>
                        {matchCounts.get(lead.id) ?? 0} matches
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={lead.nextFollowUpAt?.slice(0, 10) ?? ""}
                        onChange={(event) =>
                          updateLeadField(
                            lead.id,
                            "nextFollowUpAt",
                            event.target.value ? `${event.target.value}T00:00:00.000Z` : null,
                          )
                        }
                        onBlur={() => patchLead(lead.id, { nextFollowUpAt: lead.nextFollowUpAt })}
                        className="h-8"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">{followUpLabel(lead.nextFollowUpAt)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedLead(lead)}>
                          Details
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteLead(lead.id)}>
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-border bg-card/70 p-3 text-sm text-muted-foreground">
        Latest update: {formatDate(new Date())}. Inline edits auto-save on field blur.
      </div>

      <LeadDetailDrawer
        open={Boolean(selectedLead)}
        onOpenChange={(open) => {
          if (!open) setSelectedLead(null);
        }}
        lead={selectedLead}
        customFields={customFields}
        onCustomFieldsChanged={setCustomFields}
        onLeadUpdated={updateLeadInState}
      />

      <NewLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        customFields={customFields}
        onCreated={(lead) => {
          setLeads((prev) => [lead, ...prev]);
        }}
      />
    </>
  );
}
