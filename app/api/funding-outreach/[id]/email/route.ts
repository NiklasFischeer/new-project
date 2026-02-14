import { FundingEmailStyle } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { createFundingEmailDraft } from "@/lib/funding-server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const rawStyle = typeof body.style === "string" ? body.style.toUpperCase() : "MEDIUM";
  const style = Object.values(FundingEmailStyle).includes(rawStyle as FundingEmailStyle)
    ? (rawStyle as FundingEmailStyle)
    : FundingEmailStyle.MEDIUM;

  const draft = await createFundingEmailDraft(id, style);

  if (!draft) {
    return NextResponse.json({ error: "Funding lead not found" }, { status: 404 });
  }

  return NextResponse.json({ draft }, { status: 201 });
}
