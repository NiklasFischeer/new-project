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
