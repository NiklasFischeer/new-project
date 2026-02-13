import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { patchLead } from "@/lib/server";
import { serializeLead } from "@/lib/serialize";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await request.json();

  try {
    const result = await patchLead(id, payload);

    if ("error" in result) {
      return NextResponse.json({ error: "Validation failed", details: result.error }, { status: 400 });
    }

    if (!result.lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead: serializeLead(result.lead) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to update lead" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.lead.delete({
      where: {
        id,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to delete lead" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
