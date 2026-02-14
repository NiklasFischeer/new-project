"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FundingStatus } from "@prisma/client";
import { Download, Filter, Plus, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toast } from "@/components/ui/toast";
import { fundingFundTypeLabels, fundingStageLabels, fundingStatusLabels } from "@/lib/constants";
import { followUpLabel, formatDate } from "@/lib/date";
import { FundingLeadFilters, FundingSortKey } from "@/lib/funding-filters";
import { FundingLeadWithDrafts } from "@/lib/types";
import { FundingClusterBadge } from "./funding-cluster-badge";
import { FundingDetailDrawer } from "./funding-detail-drawer";
import { FundingPipelineBoard } from "./funding-pipeline-board";
import { FundingPriorityBadge } from "./funding-priority-badge";
import { NewFundingLeadDialog } from "./new-funding-lead-dialog";

type FundingOutreachClientProps = {
  initialLeads: FundingLeadWithDrafts[];
  initialFilters: FundingLeadFilters;
};

type FundingLeadsResponse = {
  leads: FundingLeadWithDrafts[];
};

type ImportResponse = {
  imported: number;
  skippedDuplicates: number;
};

type ToastState = {
  tone: "success" | "error" | "info";
  message: string;
};

const fundTypeOptions = [
  "VC",
  "CVC",
  "ANGEL",
  "ANGEL_NETWORK",
  "ACCELERATOR",
  "INCUBATOR",
  "GRANT",
  "PUBLIC_PROGRAM",
  "COMPETITION",
  "VENTURE_DEBT",
  "OTHER",
] as const;

const statusOptions: FundingStatus[] = [
  "NEW",
  "RESEARCHED",
  "WARM_INTRO",
  "CONTACTED",
  "MEETING_BOOKED",
  "IN_PROCESS_DD",
  "WON",
  "LOST",
];

const stageFocusOptions = ["IDEA", "PRE_SEED", "SEED", "SERIES_A", "SERIES_B_PLUS", "GROWTH", "ANY"] as const;
const geoOptions = ["AT", "DE", "EU", "UK", "Nordics", "Global"] as const;
const thesisTagOptions = [
  "AI",
  "ML",
  "Federated Learning",
  "Industrial",
  "Manufacturing",
  "Energy",
  "Cyber",
  "Data Infrastructure",
  "B2B SaaS",
  "DeepTech",
] as const;
const fitClusterOptions = ["HIGH", "MEDIUM", "LOW"] as const;
const priorityOptions = [1, 2, 3, 4, 5] as const;

function ticketRange(lead: FundingLeadWithDrafts) {
  if (lead.ticketMin && lead.ticketMax) return `${lead.ticketMin.toLocaleString("de-DE")} - ${lead.ticketMax.toLocaleString("de-DE")} ${lead.currency}`;
  if (lead.ticketMin) return `ab ${lead.ticketMin.toLocaleString("de-DE")} ${lead.currency}`;
  if (lead.ticketMax) return `bis ${lead.ticketMax.toLocaleString("de-DE")} ${lead.currency}`;
  return "-";
}

function toggleValue<T extends string | number>(values: T[], next: T) {
  if (values.includes(next)) return values.filter((item) => item !== next);
  return [...values, next];
}

function buildQueryString(filters: {
  query: string;
  fundTypes: string[];
  statuses: string[];
  stageFocus: string[];
  ticketMin: string;
  ticketMax: string;
  geoFocus: string[];
  thesisTags: string[];
  warmIntroOnly: boolean;
  deadlineWindow: "ALL" | "0_30" | "31_90" | "90_PLUS" | "NO_DEADLINE";
  lastVerifiedWindow: "ALL" | "0_90" | "90_180" | "180_PLUS";
  fitClusters: string[];
  priorities: number[];
  nextFollowUp: "ALL" | "THIS_WEEK" | "OVERDUE" | "NONE";
  sort: FundingSortKey;
}) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.fundTypes.length) params.set("fundType", filters.fundTypes.join(","));
  if (filters.statuses.length) params.set("status", filters.statuses.join(","));
  if (filters.stageFocus.length) params.set("stageFocus", filters.stageFocus.join(","));
  if (filters.ticketMin.trim()) params.set("ticketMin", filters.ticketMin.trim());
  if (filters.ticketMax.trim()) params.set("ticketMax", filters.ticketMax.trim());
  if (filters.geoFocus.length) params.set("geo", filters.geoFocus.join(","));
  if (filters.thesisTags.length) params.set("thesis", filters.thesisTags.join(","));
  if (filters.warmIntroOnly) params.set("warmIntro", "1");
  if (filters.deadlineWindow !== "ALL") params.set("deadlineWindow", filters.deadlineWindow);
  if (filters.lastVerifiedWindow !== "ALL") params.set("lastVerified", filters.lastVerifiedWindow);
  if (filters.fitClusters.length) params.set("fitCluster", filters.fitClusters.join(","));
  if (filters.priorities.length) params.set("priority", filters.priorities.join(","));
  if (filters.nextFollowUp !== "ALL") params.set("nextFollowUp", filters.nextFollowUp);
  if (filters.sort !== "PRIORITY_DESC") params.set("sort", filters.sort);
  return params.toString();
}

async function fetchFundingLeads(queryString: string): Promise<FundingLeadWithDrafts[]> {
  const response = await fetch(`/api/funding-outreach${queryString ? `?${queryString}` : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Funding leads konnten nicht geladen werden.");
  const data = (await response.json()) as FundingLeadsResponse;
  return data.leads;
}

export function FundingOutreachClient({ initialLeads, initialFilters }: FundingOutreachClientProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(initialFilters.query ?? "");
  const [fundTypes, setFundTypes] = useState<string[]>(initialFilters.fundTypes ?? []);
  const [statuses, setStatuses] = useState<string[]>(initialFilters.statuses ?? []);
  const [stageFocus, setStageFocus] = useState<string[]>(initialFilters.stageFocus ?? []);
  const [ticketMin, setTicketMin] = useState(initialFilters.ticketMin?.toString() ?? "");
  const [ticketMax, setTicketMax] = useState(initialFilters.ticketMax?.toString() ?? "");
  const [geoFocus, setGeoFocus] = useState<string[]>(initialFilters.geoFocus ?? []);
  const [thesisTags, setThesisTags] = useState<string[]>(initialFilters.thesisTags ?? []);
  const [warmIntroOnly, setWarmIntroOnly] = useState(Boolean(initialFilters.warmIntroOnly));
  const [deadlineWindow, setDeadlineWindow] = useState<"ALL" | "0_30" | "31_90" | "90_PLUS" | "NO_DEADLINE">(
    initialFilters.deadlineWindow ?? "ALL",
  );
  const [lastVerifiedWindow, setLastVerifiedWindow] = useState<"ALL" | "0_90" | "90_180" | "180_PLUS">(
    initialFilters.lastVerifiedWindow ?? "ALL",
  );
  const [fitClusters, setFitClusters] = useState<string[]>(initialFilters.fitClusters ?? []);
  const [priorities, setPriorities] = useState<number[]>(initialFilters.priorities ?? []);
  const [nextFollowUp, setNextFollowUp] = useState<"ALL" | "THIS_WEEK" | "OVERDUE" | "NONE">(
    initialFilters.nextFollowUp ?? "ALL",
  );
  const [sort, setSort] = useState<FundingSortKey>(initialFilters.sort ?? "PRIORITY_DESC");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"TABLE" | "PIPELINE">("TABLE");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<FundingStatus>("CONTACTED");
  const [bulkNextFollowUp, setBulkNextFollowUp] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const queryString = useMemo(
    () =>
      buildQueryString({
        query: search,
        fundTypes,
        statuses,
        stageFocus,
        ticketMin,
        ticketMax,
        geoFocus,
        thesisTags,
        warmIntroOnly,
        deadlineWindow,
        lastVerifiedWindow,
        fitClusters,
        priorities,
        nextFollowUp,
        sort,
      }),
    [
      deadlineWindow,
      fitClusters,
      fundTypes,
      geoFocus,
      lastVerifiedWindow,
      nextFollowUp,
      priorities,
      search,
      sort,
      stageFocus,
      statuses,
      thesisTags,
      ticketMax,
      ticketMin,
      warmIntroOnly,
    ],
  );

  const leadsQueryKey = useMemo(() => ["funding-outreach", queryString] as const, [queryString]);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: leadsQueryKey,
    queryFn: () => fetchFundingLeads(queryString),
    initialData:
      queryString ===
      buildQueryString({
        query: initialFilters.query ?? "",
        fundTypes: initialFilters.fundTypes ?? [],
        statuses: initialFilters.statuses ?? [],
        stageFocus: initialFilters.stageFocus ?? [],
        ticketMin: initialFilters.ticketMin?.toString() ?? "",
        ticketMax: initialFilters.ticketMax?.toString() ?? "",
        geoFocus: initialFilters.geoFocus ?? [],
        thesisTags: initialFilters.thesisTags ?? [],
        warmIntroOnly: Boolean(initialFilters.warmIntroOnly),
        deadlineWindow: initialFilters.deadlineWindow ?? "ALL",
        lastVerifiedWindow: initialFilters.lastVerifiedWindow ?? "ALL",
        fitClusters: initialFilters.fitClusters ?? [],
        priorities: initialFilters.priorities ?? [],
        nextFollowUp: initialFilters.nextFollowUp ?? "ALL",
        sort: initialFilters.sort ?? "PRIORITY_DESC",
      })
        ? initialLeads
        : undefined,
    placeholderData: (previousData) => previousData,
  });

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedLeadId) ?? null, [leads, selectedLeadId]);
  const allVisibleSelected = leads.length > 0 && leads.every((lead) => selectedIds.includes(lead.id));

  const patchMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const response = await fetch(`/api/funding-outreach/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Update fehlgeschlagen");
      return (await response.json()) as { lead: FundingLeadWithDrafts };
    },
    onSuccess: ({ lead }) => {
      queryClient.setQueriesData<FundingLeadWithDrafts[]>({ queryKey: ["funding-outreach"] }, (current) => {
        if (!current) return current;
        return current.map((item) => (item.id === lead.id ? lead : item));
      });
      setToast({ tone: "success", message: "Änderung gespeichert." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/funding-outreach/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Löschen fehlgeschlagen");
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueriesData<FundingLeadWithDrafts[]>({ queryKey: ["funding-outreach"] }, (current) => {
        if (!current) return current;
        return current.filter((item) => item.id !== id);
      });
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      if (selectedLeadId === id) setSelectedLeadId(null);
    },
  });

  function updateLeadField(id: string, field: keyof FundingLeadWithDrafts, value: unknown) {
    queryClient.setQueryData<FundingLeadWithDrafts[]>(leadsQueryKey, (current = []) =>
      current.map((lead) => (lead.id === id ? ({ ...lead, [field]: value } as FundingLeadWithDrafts) : lead)),
    );
  }

  function patchLead(id: string, payload: Record<string, unknown>) {
    patchMutation.mutate({ id, payload });
  }

  async function bulkSetStatus() {
    if (!selectedIds.length) return;
    await Promise.all(selectedIds.map((id) => patchMutation.mutateAsync({ id, payload: { status: bulkStatus } })));
    setToast({ tone: "success", message: `Status für ${selectedIds.length} Lead(s) aktualisiert.` });
  }

  async function bulkSetNextFollowUp() {
    if (!selectedIds.length || !bulkNextFollowUp) return;
    const isoDate = `${bulkNextFollowUp}T00:00:00.000Z`;
    await Promise.all(selectedIds.map((id) => patchMutation.mutateAsync({ id, payload: { nextFollowUpAt: isoDate } })));
    setToast({ tone: "success", message: `Follow-up für ${selectedIds.length} Lead(s) gesetzt.` });
  }

  async function bulkDelete() {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(`${selectedIds.length} Funding Leads wirklich löschen?`);
    if (!confirmed) return;
    await Promise.all(selectedIds.map((id) => deleteMutation.mutateAsync(id)));
    setToast({ tone: "success", message: `${selectedIds.length} Lead(s) gelöscht.` });
    setSelectedIds([]);
  }

  async function importCsv() {
    if (!csvFile) {
      setToast({ tone: "error", message: "Bitte zuerst eine CSV-Datei wählen." });
      return;
    }

    setImporting(true);
    const csv = await csvFile.text();
    const response = await fetch("/api/funding-outreach/import", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ csv }),
    });
    setImporting(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setToast({ tone: "error", message: data.error ?? "Import fehlgeschlagen." });
      return;
    }

    const data = (await response.json()) as ImportResponse;
    queryClient.invalidateQueries({ queryKey: ["funding-outreach"] });
    setCsvFile(null);
    setToast({
      tone: "success",
      message: `Import fertig: ${data.imported} importiert, ${data.skippedDuplicates} Duplikate übersprungen.`,
    });
  }

  async function movePipelineLead(leadId: string, status: FundingStatus) {
    await patchMutation.mutateAsync({ id: leadId, payload: { status } });
  }

  function toggleSelectVisible() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !leads.some((lead) => lead.id === id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...leads.map((lead) => lead.id)])));
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Funding Outreach</h1>
          <p className="text-sm text-muted-foreground">
            Founder-friendly CRM & Pipeline für VCs, Grants, Accelerators, Angels und CVCs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={viewMode === "TABLE" ? "default" : "outline"}
            onClick={() => setViewMode("TABLE")}
          >
            Liste
          </Button>
          <Button
            variant={viewMode === "PIPELINE" ? "default" : "outline"}
            onClick={() => setViewMode("PIPELINE")}
          >
            Pipeline
          </Button>
          <Button
            variant="outline"
            onClick={() => setToast({ tone: "info", message: "Funding Directory Integration folgt als nächster Schritt." })}
          >
            Add from Funding Directory
          </Button>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Funding Lead
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-border bg-card/70 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Suche nach Name, Fund, Kontakt, Email, Land, Tags..."
          />
          <Select value={sort} onChange={(event) => setSort(event.target.value as FundingSortKey)}>
            <option value="PRIORITY_DESC">Sortierung: Priority desc</option>
            <option value="NEXT_FOLLOW_UP_ASC">Sortierung: Next Follow-up asc</option>
            <option value="TICKET_MAX_DESC">Sortierung: Ticket Max desc</option>
            <option value="LAST_CONTACTED_DESC">Sortierung: Last Contacted desc</option>
            <option value="FIT_SCORE_DESC">Sortierung: Fit Score desc</option>
          </Select>
          <Select value={deadlineWindow} onChange={(event) => setDeadlineWindow(event.target.value as typeof deadlineWindow)}>
            <option value="ALL">Deadline: Alle</option>
            <option value="0_30">Deadline 0-30 Tage</option>
            <option value="31_90">Deadline 31-90 Tage</option>
            <option value="90_PLUS">Deadline 90+ Tage</option>
            <option value="NO_DEADLINE">Kein Deadline-Feld</option>
          </Select>
          <Select value={nextFollowUp} onChange={(event) => setNextFollowUp(event.target.value as typeof nextFollowUp)}>
            <option value="ALL">Next Follow-up: Alle</option>
            <option value="THIS_WEEK">Diese Woche</option>
            <option value="OVERDUE">Überfällig</option>
            <option value="NONE">Keins gesetzt</option>
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
          <span className="text-xs text-muted-foreground">{isLoading ? "Lade..." : `${leads.length} Treffer`}</span>
        </div>

        {showAdvancedFilters ? (
          <div className="grid gap-3 rounded-md border border-border/70 p-3">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Fund Type (multi)</p>
              <div className="flex flex-wrap gap-2">
                {fundTypeOptions.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={fundTypes.includes(option) ? "default" : "outline"}
                    onClick={() => setFundTypes((prev) => toggleValue(prev, option))}
                  >
                    {fundingFundTypeLabels[option]}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Status (multi)</p>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={statuses.includes(option) ? "default" : "outline"}
                    onClick={() => setStatuses((prev) => toggleValue(prev, option))}
                  >
                    {fundingStatusLabels[option]}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Stage Focus (multi)</p>
              <div className="flex flex-wrap gap-2">
                {stageFocusOptions.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={stageFocus.includes(option) ? "default" : "outline"}
                    onClick={() => setStageFocus((prev) => toggleValue(prev, option))}
                  >
                    {fundingStageLabels[option]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={ticketMin}
                onChange={(event) => setTicketMin(event.target.value)}
                type="number"
                placeholder="Ticket Min"
              />
              <Input
                value={ticketMax}
                onChange={(event) => setTicketMax(event.target.value)}
                type="number"
                placeholder="Ticket Max"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Geo Focus (multi)</p>
              <div className="flex flex-wrap gap-2">
                {geoOptions.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={geoFocus.includes(option) ? "default" : "outline"}
                    onClick={() => setGeoFocus((prev) => toggleValue(prev, option))}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Thesis Tags (multi)</p>
              <div className="flex flex-wrap gap-2">
                {thesisTagOptions.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={thesisTags.includes(option) ? "default" : "outline"}
                    onClick={() => setThesisTags((prev) => toggleValue(prev, option))}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Select value={lastVerifiedWindow} onChange={(event) => setLastVerifiedWindow(event.target.value as typeof lastVerifiedWindow)}>
                <option value="ALL">Last Verified: Alle</option>
                <option value="0_90">0-90 Tage</option>
                <option value="90_180">90-180 Tage</option>
                <option value="180_PLUS">180+ Tage</option>
              </Select>
              <div className="flex flex-wrap gap-2">
                {fitClusterOptions.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={fitClusters.includes(option) ? "default" : "outline"}
                    onClick={() => setFitClusters((prev) => toggleValue(prev, option))}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Priority (1-5)</p>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={priorities.includes(option) ? "default" : "outline"}
                    onClick={() => setPriorities((prev) => toggleValue(prev, option))}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-border bg-card/70 p-4">
        <h2 className="font-display text-base font-semibold">Bulk Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as FundingStatus)} className="w-56">
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {fundingStatusLabels[status]}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={bulkSetStatus} disabled={!selectedIds.length}>
            Set status
          </Button>
          <Input type="date" value={bulkNextFollowUp} onChange={(event) => setBulkNextFollowUp(event.target.value)} className="w-52" />
          <Button variant="outline" onClick={bulkSetNextFollowUp} disabled={!selectedIds.length || !bulkNextFollowUp}>
            Set next follow-up
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              setToast({ tone: "info", message: "Export wird heruntergeladen..." });
              window.location.href = `/api/funding-outreach/export${queryString ? `?${queryString}` : ""}`;
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
        leads.length === 0 ? (
          <EmptyState
            title="Noch keine Funding Leads"
            description="Add your first funding lead, starte Outreach und tracke Follow-ups in der Pipeline."
            action={<Button onClick={() => setCreateOpen(true)}>Add Funding Lead</Button>}
          />
        ) : (
          <div className="rounded-lg border border-border bg-card/80">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectVisible} />
                  </TableHead>
                  <TableHead className="w-[14%]">Name</TableHead>
                  <TableHead className="w-[10%]">Fund Type</TableHead>
                  <TableHead className="w-[10%]">Status</TableHead>
                  <TableHead className="w-[12%]">Priority / Fit</TableHead>
                  <TableHead className="w-[15%]">Kontakt</TableHead>
                  <TableHead className="w-[8%]">Stage Focus</TableHead>
                  <TableHead className="w-[8%]">Ticket & Geo</TableHead>
                  <TableHead className="w-[9%]">Next Follow-up</TableHead>
                  <TableHead className="w-[10%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const selected = selectedIds.includes(lead.id);
                  const effectiveCluster = lead.fitClusterOverride ?? lead.fitCluster;
                  const primaryStage = lead.stageFocus[0] ?? "ANY";
                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setSelectedIds((prev) => (prev.includes(lead.id) ? prev.filter((id) => id !== lead.id) : [...prev, lead.id]))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={lead.name}
                          onChange={(event) => updateLeadField(lead.id, "name", event.target.value)}
                          onBlur={(event) => patchLead(lead.id, { name: event.target.value })}
                          className="h-8 w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.fundType}
                          onChange={(event) => {
                            const fundType = event.target.value as FundingLeadWithDrafts["fundType"];
                            updateLeadField(lead.id, "fundType", fundType);
                            patchLead(lead.id, { fundType });
                          }}
                          className="h-9 w-full"
                        >
                          {fundTypeOptions.map((fundType) => (
                            <option key={fundType} value={fundType}>
                              {fundingFundTypeLabels[fundType]}
                            </option>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.status}
                          onChange={(event) => {
                            const status = event.target.value as FundingStatus;
                            updateLeadField(lead.id, "status", status);
                            patchLead(lead.id, { status });
                          }}
                          className="h-9 w-full"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {fundingStatusLabels[status]}
                            </option>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="grid gap-1">
                          <FundingPriorityBadge score={lead.fitScore} priority={lead.priority} />
                          <div className="flex flex-wrap gap-1">
                            <FundingClusterBadge cluster={effectiveCluster} />
                            {lead.warmIntroPossible ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                                Warm Intro
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={lead.contactEmail ?? ""}
                          onChange={(event) => updateLeadField(lead.id, "contactEmail", event.target.value)}
                          onBlur={(event) => patchLead(lead.id, { contactEmail: event.target.value })}
                          className="h-8 w-full"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">{lead.primaryContactName || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={primaryStage}
                          onChange={(event) => {
                            const nextStage = event.target.value as FundingLeadWithDrafts["stageFocus"][number];
                            const nextStages = [nextStage];
                            updateLeadField(lead.id, "stageFocus", nextStages);
                            patchLead(lead.id, { stageFocus: nextStages });
                          }}
                          className="h-9 w-full"
                        >
                          {stageFocusOptions.map((stage) => (
                            <option key={stage} value={stage}>
                              {fundingStageLabels[stage]}
                            </option>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell className="align-top">
                        <p className="text-sm">{ticketRange(lead)}</p>
                        <p className="text-xs text-muted-foreground">{lead.geoFocus[0] || lead.category || "-"}</p>
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="date"
                          value={lead.nextFollowUpAt?.slice(0, 10) ?? ""}
                          onChange={(event) =>
                            updateLeadField(lead.id, "nextFollowUpAt", event.target.value ? `${event.target.value}T00:00:00.000Z` : null)
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              const confirmed = window.confirm(`"${lead.name}" wirklich löschen?`);
                              if (!confirmed) return;
                              await deleteMutation.mutateAsync(lead.id);
                              setToast({ tone: "success", message: `"${lead.name}" wurde gelöscht.` });
                            }}
                          >
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
        <FundingPipelineBoard
          leads={leads}
          onMoveStatus={movePipelineLead}
          onOpenLead={(id) => setSelectedLeadId(id)}
        />
      )}

      <div className="mt-6 grid gap-4 rounded-lg border border-border bg-card/70 p-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <h3 className="font-display text-base font-semibold">CSV Import / Export</h3>
          <p className="text-sm text-muted-foreground">Header-Mapping wird automatisch erkannt. Duplikate werden erkannt über Name+Website oder Name+Country.</p>
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
                window.location.href = "/api/funding-outreach/export?template=1";
              }}
            >
              CSV Template Download
            </Button>
          </div>
        </div>
        <div className="rounded-md border border-border/70 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Outreach Snapshot</p>
          <p className="mt-1">Overdue Follow-ups: {leads.filter((lead) => lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date()).length}</p>
          <p>Won: {leads.filter((lead) => lead.status === "WON").length}</p>
          <p>Lost: {leads.filter((lead) => lead.status === "LOST").length}</p>
        </div>
      </div>

      <FundingDetailDrawer
        open={Boolean(selectedLead)}
        onOpenChange={(open) => {
          if (!open) setSelectedLeadId(null);
        }}
        lead={selectedLead}
        onLeadUpdated={(updated) => {
          queryClient.setQueriesData<FundingLeadWithDrafts[]>({ queryKey: ["funding-outreach"] }, (current) => {
            if (!current) return current;
            return current.map((lead) => (lead.id === updated.id ? updated : lead));
          });
        }}
        onToast={(tone, message) => setToast({ tone, message })}
      />

      <NewFundingLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(lead) => {
          queryClient.setQueryData<FundingLeadWithDrafts[]>(leadsQueryKey, (current = []) => [lead, ...current]);
          queryClient.invalidateQueries({ queryKey: ["funding-outreach"] });
          setToast({ tone: "success", message: `"${lead.name}" wurde angelegt.` });
        }}
      />

      {toast ? <Toast tone={toast.tone} message={toast.message} onClose={() => setToast(null)} /> : null}
    </>
  );
}
