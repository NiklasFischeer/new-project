import { addDays, differenceInCalendarDays, endOfWeek, startOfWeek } from "date-fns";
import { FundingLeadWithDrafts } from "./types";

export type FundingSortKey =
  | "PRIORITY_DESC"
  | "NEXT_FOLLOW_UP_ASC"
  | "TICKET_MAX_DESC"
  | "LAST_CONTACTED_DESC"
  | "FIT_SCORE_DESC";

export type FundingLeadFilters = {
  query?: string;
  fundTypes?: string[];
  statuses?: string[];
  stageFocus?: string[];
  ticketMin?: number | null;
  ticketMax?: number | null;
  geoFocus?: string[];
  thesisTags?: string[];
  warmIntroOnly?: boolean;
  deadlineWindow?: "ALL" | "0_30" | "31_90" | "90_PLUS" | "NO_DEADLINE";
  lastVerifiedWindow?: "ALL" | "0_90" | "90_180" | "180_PLUS";
  fitClusters?: string[];
  priorities?: number[];
  nextFollowUp?: "ALL" | "THIS_WEEK" | "OVERDUE" | "NONE";
  sort?: FundingSortKey;
};

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalize(values: string[]): Set<string> {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function intersects(source: string[], selected: string[]): boolean {
  if (!selected.length) return true;
  const selectedSet = normalize(selected);
  return source.some((value) => selectedSet.has(value.trim().toLowerCase()));
}

function effectiveCluster(lead: FundingLeadWithDrafts) {
  return lead.fitClusterOverride ?? lead.fitCluster;
}

function dateFromInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchesDeadlineWindow(lead: FundingLeadWithDrafts, window: FundingLeadFilters["deadlineWindow"]) {
  if (!window || window === "ALL") return true;
  const deadline = dateFromInput(lead.grantDeadline);
  if (window === "NO_DEADLINE") return !deadline;
  if (!deadline) return false;

  const days = differenceInCalendarDays(deadline, new Date());
  if (window === "0_30") return days >= 0 && days <= 30;
  if (window === "31_90") return days >= 31 && days <= 90;
  return days > 90;
}

function matchesLastVerifiedWindow(lead: FundingLeadWithDrafts, window: FundingLeadFilters["lastVerifiedWindow"]) {
  if (!window || window === "ALL") return true;
  const verified = dateFromInput(lead.lastVerifiedAt);
  if (!verified) return false;

  const days = differenceInCalendarDays(new Date(), verified);
  if (window === "0_90") return days >= 0 && days <= 90;
  if (window === "90_180") return days > 90 && days <= 180;
  return days > 180;
}

function matchesNextFollowUp(lead: FundingLeadWithDrafts, filter: FundingLeadFilters["nextFollowUp"]) {
  if (!filter || filter === "ALL") return true;
  const followUp = dateFromInput(lead.nextFollowUpAt);

  if (filter === "NONE") return !followUp;
  if (!followUp) return false;

  if (filter === "OVERDUE") return followUp < new Date();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  return followUp >= weekStart && followUp <= weekEnd;
}

function applySort(leads: FundingLeadWithDrafts[], sort: FundingSortKey) {
  return [...leads].sort((a, b) => {
    if (sort === "PRIORITY_DESC") return b.priority - a.priority;
    if (sort === "FIT_SCORE_DESC") return b.fitScore - a.fitScore;
    if (sort === "TICKET_MAX_DESC") return (b.ticketMax ?? 0) - (a.ticketMax ?? 0);
    if (sort === "LAST_CONTACTED_DESC") {
      return (dateFromInput(b.lastContactedAt)?.getTime() ?? 0) - (dateFromInput(a.lastContactedAt)?.getTime() ?? 0);
    }

    const aTime = dateFromInput(a.nextFollowUpAt)?.getTime() ?? addDays(new Date(), 3650).getTime();
    const bTime = dateFromInput(b.nextFollowUpAt)?.getTime() ?? addDays(new Date(), 3650).getTime();
    return aTime - bTime;
  });
}

export function parseFundingFilters(searchParams: URLSearchParams): FundingLeadFilters {
  const priorities = parseList(searchParams.get("priority"))
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5);

  const deadlineWindow = searchParams.get("deadlineWindow");
  const lastVerifiedWindow = searchParams.get("lastVerified");
  const nextFollowUp = searchParams.get("nextFollowUp");
  const sort = searchParams.get("sort");

  return {
    query: searchParams.get("q") ?? "",
    fundTypes: parseList(searchParams.get("fundType")),
    statuses: parseList(searchParams.get("status")),
    stageFocus: parseList(searchParams.get("stageFocus")),
    ticketMin: parseNumber(searchParams.get("ticketMin")),
    ticketMax: parseNumber(searchParams.get("ticketMax")),
    geoFocus: parseList(searchParams.get("geo")),
    thesisTags: parseList(searchParams.get("thesis")),
    warmIntroOnly: searchParams.get("warmIntro") === "1",
    deadlineWindow:
      deadlineWindow && ["ALL", "0_30", "31_90", "90_PLUS", "NO_DEADLINE"].includes(deadlineWindow)
        ? (deadlineWindow as FundingLeadFilters["deadlineWindow"])
        : "ALL",
    lastVerifiedWindow:
      lastVerifiedWindow && ["ALL", "0_90", "90_180", "180_PLUS"].includes(lastVerifiedWindow)
        ? (lastVerifiedWindow as FundingLeadFilters["lastVerifiedWindow"])
        : "ALL",
    fitClusters: parseList(searchParams.get("fitCluster")),
    priorities,
    nextFollowUp:
      nextFollowUp && ["ALL", "THIS_WEEK", "OVERDUE", "NONE"].includes(nextFollowUp)
        ? (nextFollowUp as FundingLeadFilters["nextFollowUp"])
        : "ALL",
    sort:
      sort && ["PRIORITY_DESC", "NEXT_FOLLOW_UP_ASC", "TICKET_MAX_DESC", "LAST_CONTACTED_DESC", "FIT_SCORE_DESC"].includes(sort)
        ? (sort as FundingSortKey)
        : "PRIORITY_DESC",
  };
}

export function filterAndSortFundingLeads(leads: FundingLeadWithDrafts[], filters: FundingLeadFilters) {
  const q = (filters.query ?? "").trim().toLowerCase();

  const filtered = leads.filter((lead) => {
    if (q) {
      const searchPool = [
        lead.name,
        lead.category ?? "",
        lead.primaryContactName ?? "",
        lead.primaryContactRole ?? "",
        lead.contactEmail ?? "",
        lead.websiteUrl ?? "",
        lead.owner ?? "",
        ...lead.geoFocus,
        ...lead.thesisTags,
      ]
        .join(" ")
        .toLowerCase();

      if (!searchPool.includes(q)) return false;
    }

    if (filters.fundTypes?.length && !filters.fundTypes.includes(lead.fundType)) return false;
    if (filters.statuses?.length && !filters.statuses.includes(lead.status)) return false;
    if (!intersects(lead.stageFocus, filters.stageFocus ?? [])) return false;
    if (!intersects(lead.geoFocus, filters.geoFocus ?? [])) return false;
    if (!intersects(lead.thesisTags, filters.thesisTags ?? [])) return false;
    if (filters.warmIntroOnly && !lead.warmIntroPossible) return false;
    if (!matchesDeadlineWindow(lead, filters.deadlineWindow)) return false;
    if (!matchesLastVerifiedWindow(lead, filters.lastVerifiedWindow)) return false;
    if (!matchesNextFollowUp(lead, filters.nextFollowUp)) return false;

    if (filters.fitClusters?.length && !filters.fitClusters.includes(effectiveCluster(lead))) return false;
    if (filters.priorities?.length && !filters.priorities.includes(lead.priority)) return false;

    if (filters.ticketMin !== null && filters.ticketMin !== undefined) {
      const candidateMax = lead.ticketMax ?? lead.ticketMin ?? 0;
      if (candidateMax < filters.ticketMin) return false;
    }

    if (filters.ticketMax !== null && filters.ticketMax !== undefined) {
      const candidateMin = lead.ticketMin ?? lead.ticketMax ?? 0;
      if (candidateMin > filters.ticketMax) return false;
    }

    return true;
  });

  return applySort(filtered, filters.sort ?? "PRIORITY_DESC");
}
