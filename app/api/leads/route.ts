import { NextRequest, NextResponse } from "next/server";
import { deriveIndustryCluster, generateHypothesis } from "@/lib/hypothesis";
import { getCustomFieldDefinitionModel, prisma } from "@/lib/prisma";
import { calculatePriorityLabel, calculatePriorityScore } from "@/lib/scoring";
import { serializeLead, serializeLeads } from "@/lib/serialize";
import { getLeads } from "@/lib/server";
import { leadInputSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const cluster = searchParams.get("cluster") ?? undefined;

  const leads = await getLeads({ query, status, cluster });
  return NextResponse.json({ leads: serializeLeads(leads) });
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = leadInputSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const customFieldNames = Object.keys(data.customFieldValues);
  const customFieldModel = getCustomFieldDefinitionModel();

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

  const priorityScore = calculatePriorityScore(data);
  const priorityLabel = calculatePriorityLabel(priorityScore);
  const industryCluster = deriveIndustryCluster(data.industry, data.dataIntensity);
  const hypothesis = generateHypothesis({
    companyName: data.companyName,
    industry: data.industry,
    dataIntensity: data.dataIntensity,
    mlActivity: data.mlActivity,
    mlActivityDescription: data.mlActivityDescription,
  });

  const lead = await prisma.lead.create({
    data: {
      ...data,
      mlActivityDescription: data.mlActivityDescription || null,
      linkedinUrl: data.linkedinUrl || null,
      notes: data.notes || null,
      priorityScore,
      priorityLabel,
      industryCluster,
      clusterOverride: data.clusterOverride || null,
      hypothesis,
      associationMemberships: data.associationMemberships,
      dataTypes: data.dataTypes,
      customFieldValues: data.customFieldValues,
    },
    include: {
      emailDrafts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return NextResponse.json({ lead: serializeLead(lead) }, { status: 201 });
}
