import { EmailStyle } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { renderOutreachEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const rawStyle = typeof body.style === "string" ? body.style.toUpperCase() : "MEDIUM";
  const style = Object.values(EmailStyle).includes(rawStyle as EmailStyle)
    ? (rawStyle as EmailStyle)
    : EmailStyle.MEDIUM;

  const lead = await prisma.lead.findUnique({ where: { id } });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const draft = renderOutreachEmail({
    style,
    companyName: lead.companyName,
    industry: lead.industry,
    contactName: lead.contactName,
    hypothesis: lead.hypothesis,
  });

  const emailDraft = await prisma.emailDraft.create({
    data: {
      leadId: id,
      style,
      subject: draft.subject,
      body: draft.body,
    },
  });

  return NextResponse.json({ draft: { ...emailDraft, createdAt: emailDraft.createdAt.toISOString() } }, { status: 201 });
}
