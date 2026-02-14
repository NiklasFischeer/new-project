"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PipelineStatus } from "@prisma/client";
import { Plus, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clusterLabel, pipelineLabels } from "@/lib/constants";
import { followUpLabel, formatDate } from "@/lib/date";
import { CustomFieldDefinitionRecord, LeadWithDrafts } from "@/lib/types";
import { ClusterBadge } from "./cluster-badge";
import { LeadDetailDrawer } from "./lead-detail-drawer";
import { LeadsPipelineBoard } from "./leads-pipeline-board";
import { NewLeadDialog } from "./new-lead-dialog";
import { PriorityBadge } from "./priority-badge";

type LeadsTableClientProps = {
  initialLeads: LeadWithDrafts[];
  initialCustomFields: CustomFieldDefinitionRecord[];
  initialQuery?: string;
  initialStatus?: string;
  initialCluster?: string;
};

type SortKey = "companyName" | "priorityScore" | "nextFollowUpAt" | "industry";

type LeadsResponse = {
  leads: LeadWithDrafts[];
};

type CustomFieldsResponse = {
  customFields: CustomFieldDefinitionRecord[];
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);

  return debounced;
}

async function fetchLeads(query: string, status: string, cluster: string): Promise<LeadWithDrafts[]> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status !== "ALL") params.set("status", status);
  if (cluster !== "ALL") params.set("cluster", cluster);

  const response = await fetch(`/api/leads${params.toString() ? `?${params.toString()}` : ""}`, {
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Failed to fetch leads");
  const data = (await response.json()) as LeadsResponse;
  return data.leads;
}

async function fetchCustomFields(): Promise<CustomFieldDefinitionRecord[]> {
  const response = await fetch("/api/custom-fields", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch custom fields");
  const data = (await response.json()) as CustomFieldsResponse;
  return data.customFields;
}

function leadMatchesCurrentFilters(lead: LeadWithDrafts, query: string, status: string, cluster: string) {
  const q = query.trim().toLowerCase();
  const effectiveCluster = lead.clusterOverride ?? lead.industryCluster;

  const matchesQuery =
    !q ||
    lead.companyName.toLowerCase().includes(q) ||
    lead.industry.toLowerCase().includes(q) ||
    lead.contactName.toLowerCase().includes(q) ||
    lead.contactEmail.toLowerCase().includes(q);

  const matchesStatus = status === "ALL" || lead.status === status;
  const matchesCluster = cluster === "ALL" || effectiveCluster === cluster;

  return matchesQuery && matchesStatus && matchesCluster;
}

export function LeadsTableClient({
  initialLeads,
  initialCustomFields,
  initialQuery = "",
  initialStatus = "ALL",
  initialCluster = "ALL",
}: LeadsTableClientProps) {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [clusterFilter, setClusterFilter] = useState(initialCluster);
  const [sortKey, setSortKey] = useState<SortKey>("priorityScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"TABLE" | "PIPELINE">("TABLE");

  const debouncedSearch = useDebouncedValue(search, 250);

  const leadsQueryKey = useMemo(
    () => ["leads", debouncedSearch.trim(), statusFilter, clusterFilter] as const,
    [debouncedSearch, statusFilter, clusterFilter],
  );

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: leadsQueryKey,
    queryFn: () => fetchLeads(debouncedSearch.trim(), statusFilter, clusterFilter),
    initialData:
      debouncedSearch.trim() === initialQuery.trim() &&
      statusFilter === initialStatus &&
      clusterFilter === initialCluster
        ? initialLeads
        : undefined,
    placeholderData: (previousData) => previousData,
  });

  const { data: customFields = [] } = useQuery({
    queryKey: ["custom-fields"],
    queryFn: fetchCustomFields,
    initialData: initialCustomFields,
  });

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [leads, selectedLeadId],
  );

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
      filteredLeads.map((lead) => [
        lead.id,
        new Set(lead.dataTypes.map((type) => type.trim().toLowerCase()).filter(Boolean)),
      ]),
    );

    const result = new Map<string, number>();
    filteredLeads.forEach((lead) => {
      const own = normalized.get(lead.id);
      if (!own || own.size === 0) {
        result.set(lead.id, 0);
        return;
      }

      let count = 0;
      filteredLeads.forEach((candidate) => {
        if (candidate.id === lead.id) return;
        const other = normalized.get(candidate.id);
        if (!other || other.size === 0) return;
        if (Array.from(own).some((item) => other.has(item))) {
          count += 1;
        }
      });

      result.set(lead.id, count);
    });

    return result;
  }, [filteredLeads]);

  const replaceLeadInCache = (updated: LeadWithDrafts) => {
    queryClient.setQueriesData<LeadWithDrafts[]>({ queryKey: ["leads"] }, (current) => {
      if (!current) return current;
      return current.map((lead) => (lead.id === updated.id ? updated : lead));
    });
  };

  const removeLeadFromCache = (leadId: string) => {
    queryClient.setQueriesData<LeadWithDrafts[]>({ queryKey: ["leads"] }, (current) => {
      if (!current) return current;
      return current.filter((lead) => lead.id !== leadId);
    });
  };

  const patchLeadMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to patch lead");
      return (await response.json()) as { lead: LeadWithDrafts };
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: leadsQueryKey });
      const previous = queryClient.getQueryData<LeadWithDrafts[]>(leadsQueryKey);

      queryClient.setQueryData<LeadWithDrafts[]>(leadsQueryKey, (current = []) =>
        current.map((lead) => (lead.id === id ? ({ ...lead, ...payload } as LeadWithDrafts) : lead)),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(leadsQueryKey, context.previous);
      }
    },
    onSuccess: ({ lead }) => {
      replaceLeadInCache(lead);
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete lead");
      return id;
    },
    onMutate: async (leadId) => {
      await queryClient.cancelQueries({ queryKey: leadsQueryKey });
      const previous = queryClient.getQueryData<LeadWithDrafts[]>(leadsQueryKey);
      queryClient.setQueryData<LeadWithDrafts[]>(leadsQueryKey, (current = []) =>
        current.filter((lead) => lead.id !== leadId),
      );
      return { previous, leadId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(leadsQueryKey, context.previous);
      }
    },
    onSuccess: (leadId) => {
      removeLeadFromCache(leadId);
      if (selectedLeadId === leadId) {
        setSelectedLeadId(null);
      }
    },
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "priorityScore" ? "desc" : "asc");
  }

  function updateLeadInState(updated: LeadWithDrafts) {
    replaceLeadInCache(updated);
  }

  function updateLeadField(id: string, field: keyof LeadWithDrafts, value: unknown) {
    queryClient.setQueryData<LeadWithDrafts[]>(leadsQueryKey, (current = []) =>
      current.map((lead) => {
        if (lead.id !== id) return lead;
        return {
          ...lead,
          [field]: value,
        };
      }),
    );
  }

  function patchLead(id: string, payload: Record<string, unknown>) {
    patchLeadMutation.mutate({ id, payload });
  }

  function deleteLead(id: string) {
    deleteLeadMutation.mutate(id);
  }

  function moveLeadStatus(id: string, status: PipelineStatus) {
    updateLeadField(id, "status", status);
    patchLead(id, { status });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">Smart outreach database with inline edits and fit scoring.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={viewMode === "TABLE" ? "default" : "outline"} onClick={() => setViewMode("TABLE")}>
            Liste
          </Button>
          <Button variant={viewMode === "PIPELINE" ? "default" : "outline"} onClick={() => setViewMode("PIPELINE")}>
            Pipeline
          </Button>
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
          {leadsLoading ? "Loading..." : `${filteredLeads.length} visible`}
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <EmptyState
          title="No leads match your filters"
          description="Adjust filters or add a new lead to kick off outreach."
          action={<Button onClick={() => setCreateOpen(true)}>Create lead</Button>}
        />
      ) : viewMode === "TABLE" ? (
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
                          patchLead(lead.id, { status });
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
                        <Button size="sm" variant="outline" onClick={() => setSelectedLeadId(lead.id)}>
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
      ) : (
        <LeadsPipelineBoard
          leads={filteredLeads}
          onMoveStatus={moveLeadStatus}
          onOpenLead={(id) => setSelectedLeadId(id)}
        />
      )}

      <div className="mt-4 rounded-lg border border-border bg-card/70 p-3 text-sm text-muted-foreground">
        Latest update: {formatDate(new Date())}. Inline edits are optimistic and sync in background.
      </div>

      <LeadDetailDrawer
        open={Boolean(selectedLead)}
        onOpenChange={(open) => {
          if (!open) setSelectedLeadId(null);
        }}
        lead={selectedLead}
        customFields={customFields}
        onCustomFieldsChanged={(fields) => {
          queryClient.setQueryData<CustomFieldDefinitionRecord[]>(["custom-fields"], fields);
        }}
        onLeadUpdated={updateLeadInState}
      />

      <NewLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        customFields={customFields}
        onCreated={(lead) => {
          if (leadMatchesCurrentFilters(lead, search, statusFilter, clusterFilter)) {
            queryClient.setQueryData<LeadWithDrafts[]>(leadsQueryKey, (current = []) => [lead, ...current]);
          }
          queryClient.invalidateQueries({ queryKey: ["leads"] });
        }}
      />
    </>
  );
}
