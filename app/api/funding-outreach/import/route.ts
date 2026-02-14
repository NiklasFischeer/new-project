import { FundingTargetStage } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  asClusterFit,
  asFundingFundType,
  asFundingReasonLost,
  asFundingStageList,
  asFundingStatus,
  asFundingTargetStage,
  asStringList,
  parseFundingCsv,
} from "@/lib/funding-csv";
import { calculateFundingFitScore, calculateFundingPriority, deriveFundingFitCluster } from "@/lib/funding-scoring";
import { getFundingLeadModel } from "@/lib/prisma";

function toNumber(value: string, fallback: number | null = null) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDate(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toBool(value: string) {
  return ["true", "1", "yes", "y", "ja"].includes(value.trim().toLowerCase());
}

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const model = getFundingLeadModel();
  if (!model) {
    return NextResponse.json(
      { error: "Funding model unavailable. Run prisma generate + migrate first." },
      { status: 503 },
    );
  }

  const body = await request.json();
  const csvRaw = body.csv as string;

  if (!csvRaw || typeof csvRaw !== "string") {
    return NextResponse.json({ error: "CSV payload missing" }, { status: 400 });
  }

  const rows = parseFundingCsv(csvRaw);
  if (!rows.length) {
    return NextResponse.json({ error: "No valid rows found" }, { status: 400 });
  }

  const existing = await model.findMany({
    select: {
      name: true,
      websiteUrl: true,
      category: true,
    },
  });

  const seenPairs = new Set(
    (existing as Array<{ name: string; websiteUrl: string | null; category: string | null }>).flatMap((item) => [
      `${normalized(item.name)}::${normalized(item.websiteUrl)}`,
      `${normalized(item.name)}::${normalized(item.category)}`,
    ]),
  );

  let imported = 0;
  let skippedDuplicates = 0;

  for (const row of rows) {
    if (!row.name) continue;

    const website = normalized(row.websiteUrl);
    const country = normalized(row.category || asStringList(row.geoFocus)[0] || "");
    const duplicateByWebsite = website && seenPairs.has(`${normalized(row.name)}::${website}`);
    const duplicateByCountry = country && seenPairs.has(`${normalized(row.name)}::${country}`);

    if (duplicateByWebsite || duplicateByCountry) {
      skippedDuplicates += 1;
      continue;
    }

    const stageMatch = toNumber(row.stageMatch, 0) ?? 0;
    const thesisMatch = toNumber(row.thesisMatch, 0) ?? 0;
    const geoMatch = toNumber(row.geoMatch, 0) ?? 0;
    const ticketMatch = toNumber(row.ticketMatch, 0) ?? 0;

    const fitScore = calculateFundingFitScore({
      stageMatch,
      thesisMatch,
      geoMatch,
      ticketMatch,
    });
    const priority = calculateFundingPriority(fitScore);
    const fitClusterOverride = asClusterFit(row.fitCluster);
    const fitCluster = deriveFundingFitCluster(fitScore);

    await model.create({
      data: {
        name: row.name,
        fundType: asFundingFundType(row.fundType),
        category: row.category || null,
        primaryContactName: row.primaryContactName || null,
        primaryContactRole: row.primaryContactRole || null,
        contactEmail: row.contactEmail || null,
        linkedinUrl: row.linkedinUrl || null,
        websiteUrl: row.websiteUrl || null,
        stageFocus: asFundingStageList(row.stageFocus),
        targetStage: asFundingTargetStage(row.targetStage || FundingTargetStage.PRE_SEED),
        ticketMin: toNumber(row.ticketMin),
        ticketMax: toNumber(row.ticketMax),
        currency: row.currency || "EUR",
        typicalInstrument: row.typicalInstrument || null,
        grantDeadline: toDate(row.grantDeadline),
        grantRequirements: row.grantRequirements || null,
        thesisTags: asStringList(row.thesisTags),
        industryFocus: asStringList(row.industryFocus),
        geoFocus: asStringList(row.geoFocus),
        warmIntroPossible: toBool(row.warmIntroPossible),
        introPath: row.introPath || null,
        stageMatch,
        thesisMatch,
        geoMatch,
        ticketMatch,
        fitScore,
        priority,
        fitCluster,
        fitClusterOverride: fitClusterOverride ?? null,
        status: asFundingStatus(row.status),
        firstContactedAt: toDate(row.firstContactedAt),
        lastContactedAt: toDate(row.lastContactedAt),
        nextFollowUpAt: toDate(row.nextFollowUpAt),
        cadenceStep: toNumber(row.cadenceStep),
        outcomeNotes: row.outcomeNotes || null,
        reasonLost: asFundingReasonLost(row.reasonLost),
        objections: row.objections || null,
        nextSteps: row.nextSteps || null,
        owner: row.owner || null,
        sourceText: row.sourceText || null,
        sourceUrl: row.sourceUrl || null,
        lastVerifiedAt: toDate(row.lastVerifiedAt),
        attachments: asStringList(row.attachments),
        notes: row.notes || null,
      },
    });

    seenPairs.add(`${normalized(row.name)}::${website}`);
    seenPairs.add(`${normalized(row.name)}::${country}`);
    imported += 1;
  }

  return NextResponse.json({ imported, skippedDuplicates });
}
