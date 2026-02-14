import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { deleteFundingLead, getFundingLeadById, patchFundingLead } from "@/lib/funding-server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getFundingLeadById(id);

  if (!lead) {
    return NextResponse.json({ error: "Funding lead not found" }, { status: 404 });
  }

  return NextResponse.json({ lead });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await request.json();

  try {
    const result = await patchFundingLead(id, payload);

    if ("error" in result) {
      return NextResponse.json({ error: "Validation failed", details: result.error }, { status: 400 });
    }

    if (!result.lead) {
      return NextResponse.json({ error: "Funding lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead: result.lead });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Funding lead not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to update funding lead" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await deleteFundingLead(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Funding lead not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to delete funding lead" }, { status: 500 });
  }
}
