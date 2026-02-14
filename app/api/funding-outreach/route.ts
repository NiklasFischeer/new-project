import { NextRequest, NextResponse } from "next/server";
import { parseFundingFilters } from "@/lib/funding-filters";
import { createFundingLead, getFundingOutreachLeads } from "@/lib/funding-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filters = parseFundingFilters(searchParams);
  const leads = await getFundingOutreachLeads(filters);
  return NextResponse.json({ leads });
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  const result = await createFundingLead(json);

  if ("error" in result) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: result.error,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ lead: result.lead }, { status: 201 });
}
