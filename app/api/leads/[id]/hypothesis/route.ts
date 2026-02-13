import { NextRequest, NextResponse } from "next/server";
import { generateHypothesis } from "@/lib/hypothesis";
import { prisma } from "@/lib/prisma";
import { serializeLead } from "@/lib/serialize";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      emailDrafts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const hypothesis = generateHypothesis({
    companyName: lead.companyName,
    industry: lead.industry,
    dataIntensity: lead.dataIntensity,
    mlActivity: lead.mlActivity,
    mlActivityDescription: lead.mlActivityDescription,
  });

  const updated = await prisma.lead.update({
    where: { id },
    data: { hypothesis },
    include: {
      emailDrafts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return NextResponse.json({ lead: serializeLead(updated) });
}
