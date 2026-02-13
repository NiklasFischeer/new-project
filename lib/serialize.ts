import { Lead, EmailDraft } from "@prisma/client";
import { LeadWithDrafts } from "./types";

type LeadWithRelations = Lead & { emailDrafts?: EmailDraft[] };

export function serializeLead(lead: LeadWithRelations): LeadWithDrafts {
  const customFieldValues =
    lead.customFieldValues && typeof lead.customFieldValues === "object" && !Array.isArray(lead.customFieldValues)
      ? (lead.customFieldValues as Record<string, unknown>)
      : {};

  return {
    ...lead,
    associationMemberships: Array.isArray(lead.associationMemberships)
      ? (lead.associationMemberships as string[])
      : [],
    dataTypes: Array.isArray(lead.dataTypes) ? (lead.dataTypes as string[]) : [],
    customFieldValues: Object.fromEntries(
      Object.entries(customFieldValues)
        .filter(([key, value]) => key.trim() && typeof value === "string")
        .map(([key, value]) => [key.trim(), String(value).trim()]),
    ),
    lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    emailDrafts: (lead.emailDrafts ?? []).map((draft) => ({
      ...draft,
      createdAt: draft.createdAt.toISOString(),
    })),
  };
}

export function serializeLeads(leads: LeadWithRelations[]): LeadWithDrafts[] {
  return leads.map(serializeLead);
}
