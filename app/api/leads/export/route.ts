import { NextRequest } from "next/server";
import { buildLeadsCsv } from "@/lib/csv";
import { getLeads } from "@/lib/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const templateOnly = searchParams.get("template") === "1";

  if (templateOnly) {
    const csvTemplate = buildLeadsCsv([], true);
    return new Response(csvTemplate, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="leads-template.csv"',
      },
    });
  }

  const q = searchParams.get("q") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const cluster = searchParams.get("cluster") ?? undefined;

  const leads = await getLeads({ query: q, status, cluster });

  const csv = buildLeadsCsv(
    leads.map((lead) => ({
      ...lead,
      associationMemberships: Array.isArray(lead.associationMemberships) ? lead.associationMemberships : [],
      dataTypes: Array.isArray(lead.dataTypes) ? lead.dataTypes : [],
      customFieldValues:
        lead.customFieldValues && typeof lead.customFieldValues === "object" && !Array.isArray(lead.customFieldValues)
          ? lead.customFieldValues
          : {},
      lastContactedAt: lead.lastContactedAt?.toISOString() ?? "",
      nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? "",
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    })),
  );

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="leads-export.csv"',
    },
  });
}
