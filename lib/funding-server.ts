import { FundingEmailStyle } from "@prisma/client";
import { filterAndSortFundingLeads, FundingLeadFilters } from "./funding-filters";
import { calculateFundingFitScore, calculateFundingPriority, deriveFundingFitCluster } from "./funding-scoring";
import { getFundingLeadModel, prisma } from "./prisma";
import { serializeFundingLead, serializeFundingLeads } from "./serialize";
import { FundingLeadWithDrafts } from "./types";
import { fundingInputSchema, partialFundingInputSchema } from "./validators";

function optionalString(value: unknown) {
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function toStageLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function fundingFitSummary(lead: FundingLeadWithDrafts) {
  const tags = lead.thesisTags.length ? lead.thesisTags.join(", ") : "Federated Learning, Industrial AI";
  const geo = lead.geoFocus.length ? lead.geoFocus.join(", ") : "EU";
  return `Score ${lead.fitScore}/10 (Priority ${lead.priority}/5), Tags: ${tags}, Geo: ${geo}.`;
}

export function fundingTicketRange(lead: FundingLeadWithDrafts) {
  if (lead.ticketMin && lead.ticketMax) return `${lead.ticketMin.toLocaleString("de-DE")} - ${lead.ticketMax.toLocaleString("de-DE")} ${lead.currency}`;
  if (lead.ticketMin) return `ab ${lead.ticketMin.toLocaleString("de-DE")} ${lead.currency}`;
  if (lead.ticketMax) return `bis ${lead.ticketMax.toLocaleString("de-DE")} ${lead.currency}`;
  return `n/a (${lead.currency})`;
}

export async function getFundingOutreachLeads(filters: FundingLeadFilters = {}): Promise<FundingLeadWithDrafts[]> {
  const model = getFundingLeadModel();
  if (!model) return [];

  const leads = (await model.findMany({
    include: {
      emailDrafts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })) as any[];

  return filterAndSortFundingLeads(serializeFundingLeads(leads as any), filters);
}

export async function getFundingLeadById(id: string): Promise<FundingLeadWithDrafts | null> {
  const model = getFundingLeadModel();
  if (!model) return null;

  const lead = await model.findUnique({
    where: { id },
    include: {
      emailDrafts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!lead) return null;
  return serializeFundingLead(lead as any);
}

export async function createFundingLead(payload: unknown) {
  const model = getFundingLeadModel();
  if (!model) {
    return { error: { formErrors: ["FundingLead model unavailable. Run prisma generate + migrate first."] } };
  }

  const parsed = fundingInputSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const input = parsed.data;
  const fitScore = calculateFundingFitScore(input);
  const priority = calculateFundingPriority(fitScore);
  const fitCluster = deriveFundingFitCluster(fitScore);

  const created = await model.create({
    data: {
      ...input,
      category: optionalString(input.category),
      primaryContactName: optionalString(input.primaryContactName),
      primaryContactRole: optionalString(input.primaryContactRole),
      contactEmail: optionalString(input.contactEmail),
      linkedinUrl: optionalString(input.linkedinUrl),
      websiteUrl: optionalString(input.websiteUrl),
      typicalInstrument: optionalString(input.typicalInstrument),
      grantRequirements: optionalString(input.grantRequirements),
      introPath: optionalString(input.introPath),
      outcomeNotes: optionalString(input.outcomeNotes),
      objections: optionalString(input.objections),
      nextSteps: optionalString(input.nextSteps),
      owner: optionalString(input.owner),
      sourceText: optionalString(input.sourceText),
      sourceUrl: optionalString(input.sourceUrl),
      notes: optionalString(input.notes),
      reasonLost: input.reasonLost ?? null,
      cadenceStep: input.cadenceStep ?? null,
      fitScore,
      priority,
      fitCluster,
    },
    include: {
      emailDrafts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return { lead: serializeFundingLead(created as any) };
}

export async function patchFundingLead(id: string, payload: unknown) {
  const model = getFundingLeadModel();
  if (!model) {
    return { error: { formErrors: ["FundingLead model unavailable. Run prisma generate + migrate first."] } };
  }

  const parsed = partialFundingInputSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const existing = await model.findUnique({ where: { id } });
  if (!existing) return { lead: null };

  const input = parsed.data;
  const merged = {
    stageMatch: input.stageMatch ?? existing.stageMatch,
    thesisMatch: input.thesisMatch ?? existing.thesisMatch,
    geoMatch: input.geoMatch ?? existing.geoMatch,
    ticketMatch: input.ticketMatch ?? existing.ticketMatch,
  };

  const fitScore = calculateFundingFitScore(merged);
  const priority = calculateFundingPriority(fitScore);
  const fitCluster = deriveFundingFitCluster(fitScore);

  const updated = await model.update({
    where: { id },
    data: {
      ...input,
      category: "category" in input ? optionalString(input.category) : undefined,
      primaryContactName: "primaryContactName" in input ? optionalString(input.primaryContactName) : undefined,
      primaryContactRole: "primaryContactRole" in input ? optionalString(input.primaryContactRole) : undefined,
      contactEmail: "contactEmail" in input ? optionalString(input.contactEmail) : undefined,
      linkedinUrl: "linkedinUrl" in input ? optionalString(input.linkedinUrl) : undefined,
      websiteUrl: "websiteUrl" in input ? optionalString(input.websiteUrl) : undefined,
      typicalInstrument: "typicalInstrument" in input ? optionalString(input.typicalInstrument) : undefined,
      grantRequirements: "grantRequirements" in input ? optionalString(input.grantRequirements) : undefined,
      introPath: "introPath" in input ? optionalString(input.introPath) : undefined,
      outcomeNotes: "outcomeNotes" in input ? optionalString(input.outcomeNotes) : undefined,
      objections: "objections" in input ? optionalString(input.objections) : undefined,
      nextSteps: "nextSteps" in input ? optionalString(input.nextSteps) : undefined,
      owner: "owner" in input ? optionalString(input.owner) : undefined,
      sourceText: "sourceText" in input ? optionalString(input.sourceText) : undefined,
      sourceUrl: "sourceUrl" in input ? optionalString(input.sourceUrl) : undefined,
      notes: "notes" in input ? optionalString(input.notes) : undefined,
      fitScore,
      priority,
      fitCluster,
    },
    include: {
      emailDrafts: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return { lead: serializeFundingLead(updated as any) };
}

export async function deleteFundingLead(id: string) {
  const model = getFundingLeadModel();
  if (!model) return { success: false };

  await model.delete({
    where: {
      id,
    },
  });

  return { success: true };
}

export async function createFundingEmailDraft(id: string, style: FundingEmailStyle) {
  const lead = await prisma.fundingLead.findUnique({ where: { id } });
  if (!lead) return null;

  const serialized = serializeFundingLead({ ...(lead as any), emailDrafts: [] });
  const stage = toStageLabel(serialized.targetStage);
  const ticketRange = fundingTicketRange(serialized);
  const summary = fundingFitSummary(serialized);
  const geo = serialized.geoFocus.length ? serialized.geoFocus.join(", ") : "EU";

  const { renderFundingEmail } = await import("./funding-email");
  const draft = renderFundingEmail({
    style,
    name: serialized.name,
    companyName: "datapool.ml",
    contactName: serialized.primaryContactName,
    fitSummary: summary,
    targetStage: stage,
    ticketRange,
    geoFocus: geo,
  });

  const created = await prisma.fundingEmailDraft.create({
    data: {
      fundingLeadId: id,
      style,
      subject: draft.subject,
      body: draft.body,
    },
  });

  return {
    ...created,
    createdAt: created.createdAt.toISOString(),
  };
}
