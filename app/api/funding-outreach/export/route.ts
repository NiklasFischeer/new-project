import { NextRequest } from "next/server";
import { buildFundingCsv } from "@/lib/funding-csv";
import { parseFundingFilters } from "@/lib/funding-filters";
import { getFundingOutreachLeads } from "@/lib/funding-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const templateOnly = searchParams.get("template") === "1";

  if (templateOnly) {
    const csvTemplate = buildFundingCsv([], true);
    return new Response(csvTemplate, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="funding-outreach-template.csv"',
      },
    });
  }

  const filters = parseFundingFilters(searchParams);
  const leads = await getFundingOutreachLeads(filters);

  const csv = buildFundingCsv(
    leads.map((lead) => ({
      ...lead,
      stageFocus: lead.stageFocus,
      thesisTags: lead.thesisTags,
      industryFocus: lead.industryFocus,
      geoFocus: lead.geoFocus,
      attachments: lead.attachments,
    })),
  );

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="funding-outreach-export.csv"',
    },
  });
}
