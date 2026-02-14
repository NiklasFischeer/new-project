import { FundingOutreachClient } from "@/components/funding/funding-outreach-client";
import { parseFundingFilters } from "@/lib/funding-filters";
import { getFundingOutreachLeads } from "@/lib/funding-server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function toSearchParams(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
      return;
    }
    if (value) params.set(key, value);
  });
  return params;
}

export default async function FundingOutreachPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const filters = parseFundingFilters(toSearchParams(resolved));
  const leads = await getFundingOutreachLeads(filters);

  return <FundingOutreachClient initialLeads={leads} initialFilters={filters} />;
}
