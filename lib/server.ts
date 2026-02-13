import { addDays, endOfWeek, startOfWeek } from "date-fns";
import { Prisma } from "@prisma/client";
import { getCustomFieldDefinitionModel, prisma } from "./prisma";
import { calculatePriorityLabel, calculatePriorityScore } from "./scoring";
import { deriveIndustryCluster, generateHypothesis } from "./hypothesis";
import { partialLeadInputSchema } from "./validators";

export async function getLeadById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      emailDrafts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function getCustomFieldDefinitions() {
  const model = getCustomFieldDefinitionModel();
  if (!model) return [];

  return model.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getLeads(params?: {
  query?: string;
  status?: string;
  cluster?: string;
}) {
  const andFilters: Prisma.LeadWhereInput[] = [];

  if (params?.query) {
    andFilters.push({
      OR: [
        { companyName: { contains: params.query } },
        { industry: { contains: params.query } },
        { contactName: { contains: params.query } },
        { contactEmail: { contains: params.query } },
      ],
    });
  }

  if (params?.status && params.status !== "ALL") {
    andFilters.push({ status: params.status as never });
  }

  if (params?.cluster && params.cluster !== "ALL") {
    andFilters.push({
      OR: [{ industryCluster: params.cluster as never }, { clusterOverride: params.cluster as never }],
    });
  }

  const where: Prisma.LeadWhereInput = andFilters.length ? { AND: andFilters } : {};

  return prisma.lead.findMany({
    where,
    orderBy: [{ priorityScore: "desc" }, { nextFollowUpAt: "asc" }, { companyName: "asc" }],
    include: {
      emailDrafts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function updateLeadComputedFields(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return null;

  const priorityScore = calculatePriorityScore(lead);
  const priorityLabel = calculatePriorityLabel(priorityScore);
  const industryCluster = deriveIndustryCluster(lead.industry, lead.dataIntensity);
  const hypothesis = generateHypothesis({
    companyName: lead.companyName,
    industry: lead.industry,
    dataIntensity: lead.dataIntensity,
    mlActivity: lead.mlActivity,
    mlActivityDescription: lead.mlActivityDescription,
  });

  return prisma.lead.update({
    where: { id: leadId },
    data: {
      priorityScore,
      priorityLabel,
      industryCluster,
      hypothesis,
    },
    include: {
      emailDrafts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function patchLead(leadId: string, payload: unknown) {
  const parsed = partialLeadInputSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const data = parsed.data;
  const updateData: Prisma.LeadUpdateInput = { ...data };

  if ("customFieldValues" in data && data.customFieldValues) {
    const names = Object.keys(data.customFieldValues);
    const model = getCustomFieldDefinitionModel();
    if (names.length) {
      await Promise.all(
        names.map((name) =>
          model?.upsert({
            where: { name },
            update: {},
            create: { name },
          }),
        ),
      );
    }
  }

  if ("linkedinUrl" in data) {
    updateData.linkedinUrl = data.linkedinUrl || null;
  }

  if ("mlActivityDescription" in data) {
    updateData.mlActivityDescription = data.mlActivityDescription || null;
  }

  if ("notes" in data) {
    updateData.notes = data.notes || null;
  }

  if ("customFieldValues" in data) {
    updateData.customFieldValues = data.customFieldValues ?? {};
  }

  if ("dataTypes" in data) {
    updateData.dataTypes = data.dataTypes ?? [];
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: updateData,
  });

  const lead = await updateLeadComputedFields(leadId);
  return { lead };
}

export async function getDashboardData() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [counts, topLeads, followUpThisWeek, pipelineCounts] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.findMany({
      orderBy: [{ priorityScore: "desc" }, { coopLikelihood: "desc" }],
      take: 6,
    }),
    prisma.lead.findMany({
      where: {
        nextFollowUpAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      orderBy: {
        nextFollowUpAt: "asc",
      },
      take: 12,
    }),
    prisma.lead.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    }),
  ]);

  const openPipeline = pipelineCounts
    .filter((row) => row.status !== "WON" && row.status !== "LOST")
    .reduce((acc, row) => acc + row._count.status, 0);

  const staleLeads = await prisma.lead.count({
    where: {
      OR: [
        { lastContactedAt: null },
        {
          lastContactedAt: {
            lte: addDays(now, -21),
          },
        },
      ],
      status: {
        notIn: ["WON", "LOST"],
      },
    },
  });

  return {
    counts,
    openPipeline,
    staleLeads,
    topLeads,
    followUpThisWeek,
    pipelineCounts,
  };
}
