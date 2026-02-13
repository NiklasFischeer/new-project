import { ClusterFit, PipelineStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { asClusterFit, asPipelineStatus, parseLeadsCsv } from "@/lib/csv";
import { deriveIndustryCluster, generateHypothesis } from "@/lib/hypothesis";
import { getCustomFieldDefinitionModel, prisma } from "@/lib/prisma";
import { calculatePriorityLabel, calculatePriorityScore } from "@/lib/scoring";

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toBool(value: string) {
  return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
}

function asArray(value: string) {
  if (!value) return [];
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asObject(value: string) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, raw]) => [key.trim(), String(raw).trim()] as const)
        .filter(([key, val]) => key && val),
    );
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const csvRaw = body.csv as string;

  if (!csvRaw || typeof csvRaw !== "string") {
    return NextResponse.json({ error: "CSV payload missing" }, { status: 400 });
  }

  const rows = parseLeadsCsv(csvRaw);
  if (!rows.length) {
    return NextResponse.json({ error: "No valid rows found" }, { status: 400 });
  }

  let imported = 0;
  const customFieldModel = getCustomFieldDefinitionModel();

  for (const row of rows) {
    if (!row.companyName || !row.industry || !row.contactName || !row.contactRole || !row.contactEmail) {
      continue;
    }

    const digitalMaturity = toNumber(row.digitalMaturity, 0);
    const dataIntensity = toNumber(row.dataIntensity, 0);
    const competitivePressure = toNumber(row.competitivePressure, 0);
    const coopLikelihood = toNumber(row.coopLikelihood, 0);

    const priorityScore = calculatePriorityScore({
      digitalMaturity,
      dataIntensity,
      competitivePressure,
      coopLikelihood,
    });

    const priorityLabel = calculatePriorityLabel(priorityScore);
    const mlActivity = toBool(row.mlActivity);
    const clusterOverride = asClusterFit(row.industryCluster);
    const autoCluster = deriveIndustryCluster(row.industry, dataIntensity);
    const customFieldValues = asObject(row.customFieldValues);

    const customFieldNames = Object.keys(customFieldValues);
    if (customFieldNames.length && customFieldModel) {
      await Promise.all(
        customFieldNames.map((name) =>
          customFieldModel.upsert({
            where: { name },
            update: {},
            create: { name },
          }),
        ),
      );
    }

    const hypothesis = generateHypothesis({
      companyName: row.companyName,
      industry: row.industry,
      dataIntensity,
      mlActivity,
      mlActivityDescription: row.mlActivityDescription,
    });

    await prisma.lead.create({
      data: {
        companyName: row.companyName,
        industry: row.industry,
        sizeEmployees: toNumber(row.sizeEmployees, 1),
        digitalMaturity,
        mlActivity,
        mlActivityDescription: row.mlActivityDescription || null,
        associationMemberships: asArray(row.associationMemberships),
        dataTypes: asArray(row.dataTypes),
        contactName: row.contactName,
        contactRole: row.contactRole,
        contactEmail: row.contactEmail,
        linkedinUrl: row.linkedinUrl || null,
        warmIntroPossible: toBool(row.warmIntroPossible),
        dataIntensity,
        competitivePressure,
        coopLikelihood,
        priorityScore,
        priorityLabel,
        hypothesis,
        industryCluster: autoCluster,
        clusterOverride: clusterOverride as ClusterFit | null,
        status: asPipelineStatus(row.status) as PipelineStatus,
        lastContactedAt: toDate(row.lastContactedAt),
        nextFollowUpAt: toDate(row.nextFollowUpAt),
        notes: row.notes || null,
        customFieldValues,
      },
    });

    imported += 1;
  }

  return NextResponse.json({ imported });
}
