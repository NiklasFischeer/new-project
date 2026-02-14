import { z } from "zod";

const dateInputSchema = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((value) => {
    if (!value) return null;
    const date = typeof value === "string" ? new Date(value) : value;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return null;
    }
    return date;
  });

export const leadInputSchema = z.object({
  companyName: z.string().trim().min(1),
  industry: z.string().trim().min(1),
  sizeEmployees: z.coerce.number().int().min(1),
  digitalMaturity: z.coerce.number().int().min(0).max(3),
  mlActivity: z.coerce.boolean(),
  mlActivityDescription: z.string().trim().optional().nullable(),
  associationMemberships: z.array(z.string().trim()).default([]),
  dataTypes: z
    .array(z.string().trim())
    .default([])
    .transform((values) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))),
  contactName: z.string().trim().min(1),
  contactRole: z.string().trim().min(1),
  contactEmail: z.string().email(),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal("")),
  warmIntroPossible: z.coerce.boolean(),
  dataIntensity: z.coerce.number().int().min(0).max(3),
  competitivePressure: z.coerce.number().int().min(0).max(2),
  coopLikelihood: z.coerce.number().int().min(0).max(2),
  status: z
    .enum([
      "NEW",
      "CONTACTED",
      "REPLIED",
      "INTERVIEW",
      "PILOT_CANDIDATE",
      "PILOT_RUNNING",
      "WON",
      "LOST",
    ])
    .default("NEW"),
  clusterOverride: z.enum(["HIGH", "MEDIUM", "LOW"]).nullable().optional(),
  lastContactedAt: dateInputSchema,
  nextFollowUpAt: dateInputSchema,
  notes: z.string().optional().nullable(),
  customFieldValues: z
    .record(z.string())
    .default({})
    .transform((fields) =>
      Object.fromEntries(
        Object.entries(fields)
          .map(([key, value]) => [key.trim(), value.trim()] as const)
          .filter(([key, value]) => key && value),
      ),
    ),
});

export const partialLeadInputSchema = leadInputSchema.partial();

const listStringSchema = z
  .array(z.string().trim())
  .default([])
  .transform((values) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))));

export const fundingInputSchema = z.object({
  name: z.string().trim().min(1),
  fundType: z.enum([
    "VC",
    "CVC",
    "ANGEL",
    "ANGEL_NETWORK",
    "ACCELERATOR",
    "INCUBATOR",
    "GRANT",
    "PUBLIC_PROGRAM",
    "COMPETITION",
    "VENTURE_DEBT",
    "OTHER",
  ]),
  category: z.string().trim().optional().nullable(),
  primaryContactName: z.string().trim().optional().nullable(),
  primaryContactRole: z.string().trim().optional().nullable(),
  contactEmail: z.string().trim().email().optional().nullable().or(z.literal("")),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal("")),
  websiteUrl: z.string().url().optional().nullable().or(z.literal("")),
  stageFocus: z
    .array(z.enum(["IDEA", "PRE_SEED", "SEED", "SERIES_A", "SERIES_B_PLUS", "GROWTH", "ANY"]))
    .default([]),
  targetStage: z.enum(["PRE_SEED", "SEED", "SERIES_A"]).default("PRE_SEED"),
  ticketMin: z.coerce.number().int().min(0).optional().nullable(),
  ticketMax: z.coerce.number().int().min(0).optional().nullable(),
  currency: z.string().trim().default("EUR"),
  typicalInstrument: z.string().trim().optional().nullable(),
  grantDeadline: dateInputSchema,
  grantRequirements: z.string().trim().optional().nullable(),
  thesisTags: listStringSchema,
  industryFocus: listStringSchema,
  geoFocus: listStringSchema,
  warmIntroPossible: z.coerce.boolean(),
  introPath: z.string().trim().optional().nullable(),
  stageMatch: z.coerce.number().int().min(0).max(3).default(0),
  thesisMatch: z.coerce.number().int().min(0).max(3).default(0),
  geoMatch: z.coerce.number().int().min(0).max(2).default(0),
  ticketMatch: z.coerce.number().int().min(0).max(2).default(0),
  fitClusterOverride: z.enum(["HIGH", "MEDIUM", "LOW"]).nullable().optional(),
  status: z
    .enum(["NEW", "RESEARCHED", "WARM_INTRO", "CONTACTED", "MEETING_BOOKED", "IN_PROCESS_DD", "WON", "LOST"])
    .default("NEW"),
  firstContactedAt: dateInputSchema,
  lastContactedAt: dateInputSchema,
  nextFollowUpAt: dateInputSchema,
  cadenceStep: z.coerce.number().int().min(0).optional().nullable(),
  outcomeNotes: z.string().optional().nullable(),
  reasonLost: z.enum(["NO_FIT", "NOT_NOW", "NO_RESPONSE", "REJECTED", "OTHER"]).nullable().optional(),
  objections: z.string().optional().nullable(),
  nextSteps: z.string().optional().nullable(),
  attachments: listStringSchema,
  owner: z.string().trim().optional().nullable(),
  sourceText: z.string().trim().optional().nullable(),
  sourceUrl: z.string().url().optional().nullable().or(z.literal("")),
  lastVerifiedAt: dateInputSchema,
  notes: z.string().optional().nullable(),
});

export const partialFundingInputSchema = fundingInputSchema.partial();
