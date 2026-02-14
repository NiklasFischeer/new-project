import { EmailDraft, FundingEmailDraft, FundingLead, Lead } from "@prisma/client";
import { FundingLeadWithDrafts, LeadWithDrafts } from "./types";

type LeadWithRelations = Lead & { emailDrafts?: EmailDraft[] };
type FundingLeadWithRelations = FundingLead & { emailDrafts?: FundingEmailDraft[] };

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export function serializeLead(lead: LeadWithRelations): LeadWithDrafts {
  const customFieldValues =
    lead.customFieldValues && typeof lead.customFieldValues === "object" && !Array.isArray(lead.customFieldValues)
      ? (lead.customFieldValues as Record<string, unknown>)
      : {};

  return {
    ...lead,
    associationMemberships: asStringArray(lead.associationMemberships),
    dataTypes: asStringArray(lead.dataTypes),
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

export function serializeFundingLead(lead: FundingLeadWithRelations): FundingLeadWithDrafts {
  return {
    ...lead,
    stageFocus: asStringArray(lead.stageFocus),
    thesisTags: asStringArray(lead.thesisTags),
    industryFocus: asStringArray(lead.industryFocus),
    geoFocus: asStringArray(lead.geoFocus),
    attachments: asStringArray(lead.attachments),
    grantDeadline: lead.grantDeadline?.toISOString() ?? null,
    firstContactedAt: lead.firstContactedAt?.toISOString() ?? null,
    lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
    lastVerifiedAt: lead.lastVerifiedAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    emailDrafts: (lead.emailDrafts ?? []).map((draft) => ({
      ...draft,
      createdAt: draft.createdAt.toISOString(),
    })),
  };
}

export function serializeFundingLeads(leads: FundingLeadWithRelations[]): FundingLeadWithDrafts[] {
  return leads.map(serializeFundingLead);
}
