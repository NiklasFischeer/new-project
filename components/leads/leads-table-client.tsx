"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfWeek, startOfDay, startOfWeek } from "date-fns";
import { PipelineStatus } from "@prisma/client";
import { Download, Filter, Plus, SlidersHorizontal, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toast } from "@/components/ui/toast";
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

type LeadSortKey =
  | "PRIORITY_DESC"
  | "NEXT_FOLLOW_UP_ASC"
  | "COMPANY_ASC"
  | "INDUSTRY_ASC"
  | "LAST_CONTACTED_DESC";

type LeadsResponse = {
  leads: LeadWithDrafts[];
};

type CustomFieldsResponse = {
  customFields: CustomFieldDefinitionRecord[];
};

type ToastState = {
  tone: "success" | "error" | "info";
  message: string;
};

type NextFollowUpFilter = "ALL" | "THIS_WEEK" | "OVERDUE" | "NONE";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);

  return debounced;
}

function buildLeadsQueryString(query: string, status: string, cluster: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (status !== "ALL") params.set("status", status);
  if (cluster !== "ALL") params.set("cluster", cluster);
  return params.toString();
}

async function fetchLeads(query: string, status: string, cluster: string): Promise<LeadWithDrafts[]> {
  const queryString = buildLeadsQueryString(query, status, cluster);

  const response = await fetch(`/api/leads${queryString ? `?${queryString}` : ""}`, {
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Leads konnten nicht geladen werden.");
  const data = (await response.json()) as LeadsResponse;
  return data.leads;
}

async function fetchCustomFields(): Promise<CustomFieldDefinitionRecord[]> {
  const response = await fetch("/api/custom-fields", { cache: "no-store" });
  if (!response.ok) throw new Error("Custom Fields konnten nicht geladen werden.");
  const data = (await response.json()) as CustomFieldsResponse;
  return data.customFields;
}

function toggleValue<T extends number>(values: T[], next: T) {
  if (values.includes(next)) return values.filter((item) => item !== next);
  return [...values, next];
}

function matchesNextFollowUp(dateValue: string | null, filter: NextFollowUpFilter) {
  if (filter === "ALL") return true;

  if (!dateValue) {
    return filter === "NONE";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return filter === "NONE";
  }

  if (filter === "NONE") return false;

  if (filter === "OVERDUE") {
    return date < startOfDay(new Date());
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  return date >= weekStart && date <= weekEnd;
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
  const [sort, setSort] = useState<LeadSortKey>("PRIORITY_DESC");
  const [warmIntroOnly, setWarmIntroOnly] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priorityFilters, setPriorityFilters] = useState<number[]>([]);
  const [nextFollowUpFilter, setNextFollowUpFilter] = useState<NextFollowUpFilter>("ALL");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"TABLE" | "PIPELINE">("TABLE");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<PipelineStatus>("CONTACTED");
  const [bulkNextFollowUp, setBulkNextFollowUp] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

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
      const matchesWarmIntro = !warmIntroOnly || lead.warmIntroPossible;
      const matchesPriority = !priorityFilters.length || priorityFilters.includes(lead.priorityLabel);
      const matchesFollowUp = matchesNextFollowUp(lead.nextFollowUpAt, nextFollowUpFilter);

      return (
        matchesQuery &&
        matchesStatus &&
        matchesCluster &&
        matchesWarmIntro &&
        matchesPriority &&
        matchesFollowUp
      );
    });

    return [...base].sort((a, b) => {
      if (sort === "PRIORITY_DESC") return b.priorityScore - a.priorityScore;

      if (sort === "NEXT_FOLLOW_UP_ASC") {
        const aDate = a.nextFollowUpAt ? new Date(a.nextFollowUpAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.nextFollowUpAt ? new Date(b.nextFollowUpAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      }

      if (sort === "COMPANY_ASC") return a.companyName.localeCompare(b.companyName);
      if (sort === "INDUSTRY_ASC") return a.industry.localeCompare(b.industry);

      const aDate = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0;
      const bDate = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [clusterFilter, leads, nextFollowUpFilter, priorityFilters, search, sort, statusFilter, warmIntroOnly]);

  const allVisibleSelected = filteredLeads.length > 0 && filteredLeads.every((lead) => selectedIds.includes(lead.id));

  useEffect(() => {
    const visibleIds = new Set(filteredLeads.map((lead) => lead.id));
    setSelectedIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [filteredLeads]);

  const exportParams = useMemo(
    () => buildLeadsQueryString(search, statusFilter, clusterFilter),
    [clusterFilter, search, statusFilter],
  );

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

      if (!response.ok) throw new Error("Update fehlgeschlagen");
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
      setToast({ tone: "error", message: "Änderung konnte nicht gespeichert werden." });
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

      if (!response.ok) throw new Error("Löschen fehlgeschlagen");
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
      setToast({ tone: "error", message: "Lead konnte nicht gelöscht werden." });
    },
    onSuccess: (leadId) => {
      removeLeadFromCache(leadId);
      setSelectedIds((prev) => prev.filter((id) => id !== leadId));
      if (selectedLeadId === leadId) {
        setSelectedLeadId(null);
      }
    },
  });

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

  async function deleteLead(id: string, companyName: string) {
    const confirmed = window.confirm(`"${companyName}" wirklich löschen?`);
    if (!confirmed) return;

    await deleteLeadMutation.mutateAsync(id);
    setToast({ tone: "success", message: `"${companyName}" wurde gelöscht.` });
  }

  async function bulkSetStatus() {
    if (!selectedIds.length) return;

    try {
      await Promise.all(
        selectedIds.map((id) => patchLeadMutation.mutateAsync({ id, payload: { status: bulkStatus } })),
      );
      setToast({ tone: "success", message: `Status für ${selectedIds.length} Lead(s) aktualisiert.` });
    } catch {
      setToast({ tone: "error", message: "Bulk-Status konnte nicht vollständig gesetzt werden." });
    }
  }

  async function bulkSetNextFollowUp() {
    if (!selectedIds.length || !bulkNextFollowUp) return;

    const isoDate = `${bulkNextFollowUp}T00:00:00.000Z`;

    try {
      await Promise.all(
        selectedIds.map((id) => patchLeadMutation.mutateAsync({ id, payload: { nextFollowUpAt: isoDate } })),
      );
      setToast({ tone: "success", message: `Follow-up für ${selectedIds.length} Lead(s) gesetzt.` });
    } catch {
      setToast({ tone: "error", message: "Bulk Follow-up konnte nicht vollständig gesetzt werden." });
    }
  }

  async function bulkDelete() {
    if (!selectedIds.length) return;

    const confirmed = window.confirm(`${selectedIds.length} Leads wirklich löschen?`);
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map((id) => deleteLeadMutation.mutateAsync(id)));
      setToast({ tone: "success", message: `${selectedIds.length} Lead(s) gelöscht.` });
      setSelectedIds([]);
    } catch {
      setToast({ tone: "error", message: "Nicht alle ausgewählten Leads konnten gelöscht werden." });
    }
  }

  async function importCsv() {
    if (!csvFile) {
      setToast({ tone: "error", message: "Bitte zuerst eine CSV-Datei auswählen." });
      return;
    }

    setImporting(true);
    const csv = await csvFile.text();

    const response = await fetch("/api/leads/import", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ csv }),
    });

    setImporting(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setToast({ tone: "error", message: data.error ?? "CSV-Import fehlgeschlagen." });
      return;
    }

    const data = (await response.json()) as { imported: number };
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    setCsvFile(null);
    setToast({ tone: "success", message: `Import fertig: ${data.imported} Lead(s) importiert.` });
  }

  function moveLeadStatus(id: string, status: PipelineStatus) {
    updateLeadField(id, "status", status);
    patchLead(id, { status });
  }

  function toggleSelectVisible() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredLeads.some((lead) => lead.id === id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredLeads.map((lead) => lead.id)])));
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Smart Outreach Datenbank mit Pipeline, Bulk Actions und CSV-Import/Export.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={viewMode === "TABLE" ? "default" : "outline"} onClick={() => setViewMode("TABLE")}>
            Liste
          </Button>
          <Button variant={viewMode === "PIPELINE" ? "default" : "outline"} onClick={() => setViewMode("PIPELINE")}>
            Pipeline
          </Button>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-border bg-card/70 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Suche nach Firma, Branche, Kontakt oder Email..."
          />
          <Select value={sort} onChange={(event) => setSort(event.target.value as LeadSortKey)}>
            <option value="PRIORITY_DESC">Sortierung: Priority desc</option>
            <option value="NEXT_FOLLOW_UP_ASC">Sortierung: Next Follow-up asc</option>
            <option value="COMPANY_ASC">Sortierung: Company asc</option>
            <option value="INDUSTRY_ASC">Sortierung: Industry asc</option>
            <option value="LAST_CONTACTED_DESC">Sortierung: Last Contacted desc</option>
          </Select>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">Status: Alle</option>
            {Object.entries(pipelineLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select value={clusterFilter} onChange={(event) => setClusterFilter(event.target.value)}>
            <option value="ALL">Cluster: Alle</option>
            <option value="HIGH">{clusterLabel.HIGH}</option>
            <option value="MEDIUM">{clusterLabel.MEDIUM}</option>
            <option value="LOW">{clusterLabel.LOW}</option>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={warmIntroOnly ? "default" : "outline"}
            onClick={() => setWarmIntroOnly((prev) => !prev)}
          >
            Warm Intro
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowAdvancedFilters((prev) => !prev)} className="gap-2">
            <Filter className="h-3.5 w-3.5" />
            Erweiterte Filter
          </Button>
          <span className="inline-flex items-center gap-2 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {leadsLoading ? "Lade..." : `${filteredLeads.length} Treffer`}
          </span>
        </div>

        {showAdvancedFilters ? (
          <div className="grid gap-3 rounded-md border border-border/70 p-3 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Priority (1-5)</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={priorityFilters.includes(option) ? "default" : "outline"}
                    onClick={() => setPriorityFilters((prev) => toggleValue(prev, option))}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <p className="text-xs font-medium text-muted-foreground">Next Follow-up</p>
              <Select
                value={nextFollowUpFilter}
                onChange={(event) => setNextFollowUpFilter(event.target.value as NextFollowUpFilter)}
              >
                <option value="ALL">Alle</option>
                <option value="THIS_WEEK">Diese Woche</option>
                <option value="OVERDUE">Überfällig</option>
                <option value="NONE">Keins gesetzt</option>
              </Select>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-border bg-card/70 p-4">
        <h2 className="font-display text-base font-semibold">Bulk Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as PipelineStatus)} className="w-56">
            {Object.entries(pipelineLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={bulkSetStatus} disabled={!selectedIds.length}>
            Set status
          </Button>
          <Input
            type="date"
            value={bulkNextFollowUp}
            onChange={(event) => setBulkNextFollowUp(event.target.value)}
            className="w-52"
          />
          <Button variant="outline" onClick={bulkSetNextFollowUp} disabled={!selectedIds.length || !bulkNextFollowUp}>
            Set next follow-up
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              setToast({ tone: "info", message: "Export wird heruntergeladen..." });
              window.location.href = `/api/leads/export${exportParams ? `?${exportParams}` : ""}`;
            }}
          >
            <Download className="h-4 w-4" />
            Export filtered
          </Button>
          <Button variant="destructive" onClick={bulkDelete} disabled={!selectedIds.length}>
            Delete selected
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{selectedIds.length} Zeile(n) ausgewählt</p>
      </div>

      {viewMode === "TABLE" ? (
        filteredLeads.length === 0 ? (
          <EmptyState
            title="Keine Leads gefunden"
            description="Passe die Filter an oder lege einen neuen Lead an."
            action={<Button onClick={() => setCreateOpen(true)}>Add Lead</Button>}
          />
        ) : (
          <div className="rounded-lg border border-border bg-card/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectVisible} />
                  </TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Cluster</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data types</TableHead>
                  <TableHead>Matches</TableHead>
                  <TableHead>Next follow-up</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const effectiveCluster = lead.clusterOverride ?? lead.industryCluster;
                  const selected = selectedIds.includes(lead.id);

                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(lead.id) ? prev.filter((id) => id !== lead.id) : [...prev, lead.id],
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={lead.companyName}
                          onChange={(event) => updateLeadField(lead.id, "companyName", event.target.value)}
                          onBlur={(event) => patchLead(lead.id, { companyName: event.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={lead.industry}
                          onChange={(event) => updateLeadField(lead.id, "industry", event.target.value)}
                          onBlur={(event) => patchLead(lead.id, { industry: event.target.value })}
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
                          onBlur={(event) => patchLead(lead.id, { contactEmail: event.target.value })}
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
                          className="h-9 min-w-[11rem]"
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
                            {lead.dataTypes.length > 3 ? (
                              <Badge variant="secondary">+{lead.dataTypes.length - 3}</Badge>
                            ) : null}
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
                          onBlur={(event) =>
                            patchLead(lead.id, {
                              nextFollowUpAt: event.target.value ? `${event.target.value}T00:00:00.000Z` : null,
                            })
                          }
                          className="h-8"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">{followUpLabel(lead.nextFollowUpAt)}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedLeadId(lead.id)}>
                            Details
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteLead(lead.id, lead.companyName)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <LeadsPipelineBoard
          leads={filteredLeads}
          onMoveStatus={moveLeadStatus}
          onOpenLead={(id) => setSelectedLeadId(id)}
        />
      )}

      <div className="mt-6 grid gap-4 rounded-lg border border-border bg-card/70 p-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <h3 className="font-display text-base font-semibold">CSV Import / Export</h3>
          <p className="text-sm text-muted-foreground">
            Importiere Leads als CSV oder exportiere den aktuell gefilterten View.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input type="file" accept=".csv,text/csv" onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)} />
            <Button onClick={importCsv} disabled={importing} className="gap-2">
              <Upload className="h-4 w-4" />
              {importing ? "Importiert..." : "CSV importieren"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setToast({ tone: "info", message: "CSV-Template wird heruntergeladen..." });
                window.location.href = "/api/leads/export?template=1";
              }}
            >
              CSV Template Download
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setToast({ tone: "info", message: "CSV-Export wird heruntergeladen..." });
                window.location.href = `/api/leads/export${exportParams ? `?${exportParams}` : ""}`;
              }}
            >
              <Download className="h-4 w-4" />
              Export filtered
            </Button>
          </div>
        </div>
        <div className="rounded-md border border-border/70 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Outreach Snapshot</p>
          <p className="mt-1">
            Overdue Follow-ups: {filteredLeads.filter((lead) => lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date()).length}
          </p>
          <p>Warm Intro möglich: {filteredLeads.filter((lead) => lead.warmIntroPossible).length}</p>
          <p>Pilot Running: {filteredLeads.filter((lead) => lead.status === "PILOT_RUNNING").length}</p>
          <p>Letztes Update: {formatDate(new Date())}</p>
        </div>
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
          queryClient.setQueryData<LeadWithDrafts[]>(leadsQueryKey, (current = []) => [lead, ...current]);
          queryClient.invalidateQueries({ queryKey: ["leads"] });
          setToast({ tone: "success", message: `"${lead.companyName}" wurde angelegt.` });
        }}
      />

      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
    </>
  );
}
