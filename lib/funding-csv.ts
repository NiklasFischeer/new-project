import {
  ClusterFit,
  FundingFundType,
  FundingReasonLost,
  FundingStage,
  FundingStatus,
  FundingTargetStage,
} from "@prisma/client";

const fundingCsvHeaders = [
  "id",
  "name",
  "fundType",
  "category",
  "primaryContactName",
  "primaryContactRole",
  "contactEmail",
  "linkedinUrl",
  "websiteUrl",
  "stageFocus",
  "targetStage",
  "ticketMin",
  "ticketMax",
  "currency",
  "typicalInstrument",
  "grantDeadline",
  "grantRequirements",
  "thesisTags",
  "industryFocus",
  "geoFocus",
  "warmIntroPossible",
  "introPath",
  "stageMatch",
  "thesisMatch",
  "geoMatch",
  "ticketMatch",
  "fitScore",
  "priority",
  "fitCluster",
  "status",
  "firstContactedAt",
  "lastContactedAt",
  "nextFollowUpAt",
  "cadenceStep",
  "outcomeNotes",
  "reasonLost",
  "objections",
  "nextSteps",
  "owner",
  "sourceText",
  "sourceUrl",
  "lastVerifiedAt",
  "attachments",
  "notes",
] as const;

export type FundingCsvRow = Record<(typeof fundingCsvHeaders)[number], string>;

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const output = String(value);
  if (/[",\n]/.test(output)) {
    return `"${output.replaceAll("\"", "\"\"")}"`;
  }
  return output;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let buffer = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        buffer += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(buffer);
      buffer = "";
      continue;
    }

    buffer += char;
  }

  result.push(buffer);
  return result;
}

export function buildFundingCsv(rows: Array<Record<string, unknown>>, templateOnly = false): string {
  const header = fundingCsvHeaders.join(",");
  if (templateOnly) return `${header}\n`;

  const body = rows
    .map((row) =>
      fundingCsvHeaders
        .map((key) => {
          const value =
            key === "stageFocus" && Array.isArray(row[key])
              ? (row[key] as unknown[]).join("|")
              : key === "thesisTags" && Array.isArray(row[key])
                ? (row[key] as unknown[]).join("|")
                : key === "industryFocus" && Array.isArray(row[key])
                  ? (row[key] as unknown[]).join("|")
                  : key === "geoFocus" && Array.isArray(row[key])
                    ? (row[key] as unknown[]).join("|")
                    : key === "attachments" && Array.isArray(row[key])
                      ? (row[key] as unknown[]).join("|")
                      : row[key];
          return escapeCsv(value);
        })
        .join(","),
    )
    .join("\n");

  return `${header}\n${body}`;
}

export function parseFundingCsv(input: string): FundingCsvRow[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headerCells = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {} as FundingCsvRow;

    fundingCsvHeaders.forEach((key) => {
      const index = headerCells.indexOf(key);
      row[key] = index >= 0 ? cells[index] ?? "" : "";
    });
    return row;
  });
}

export function asStringList(value: string): string[] {
  if (!value) return [];
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function asFundingFundType(value: string): FundingFundType {
  const normalized = value.trim().toUpperCase().replaceAll(" ", "_");
  if (normalized in FundingFundType) {
    return normalized as FundingFundType;
  }
  return FundingFundType.OTHER;
}

export function asFundingStatus(value: string): FundingStatus {
  const normalized = value.trim().toUpperCase().replaceAll(" ", "_");
  if (normalized in FundingStatus) {
    return normalized as FundingStatus;
  }
  return FundingStatus.NEW;
}

export function asFundingTargetStage(value: string): FundingTargetStage {
  const normalized = value.trim().toUpperCase().replaceAll("-", "_");
  if (normalized in FundingTargetStage) {
    return normalized as FundingTargetStage;
  }
  return FundingTargetStage.PRE_SEED;
}

export function asFundingStageList(value: string): FundingStage[] {
  const list = asStringList(value)
    .map((entry) => entry.trim().toUpperCase().replaceAll("+", "_PLUS").replaceAll("-", "_"))
    .map((entry) => (entry === "SERIES_A" ? "SERIES_A" : entry))
    .filter((entry): entry is keyof typeof FundingStage => entry in FundingStage)
    .map((entry) => FundingStage[entry]);

  return Array.from(new Set(list));
}

export function asFundingReasonLost(value: string): FundingReasonLost | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replaceAll(" ", "_");
  if (normalized in FundingReasonLost) {
    return normalized as FundingReasonLost;
  }
  return null;
}

export function asClusterFit(value: string): ClusterFit | null {
  const normalized = value.trim().toUpperCase();
  if (normalized in ClusterFit) {
    return normalized as ClusterFit;
  }
  return null;
}
