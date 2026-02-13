import { ClusterFit, PipelineStatus } from "@prisma/client";

const csvHeaders = [
  "id",
  "companyName",
  "industry",
  "sizeEmployees",
  "digitalMaturity",
  "mlActivity",
  "mlActivityDescription",
  "associationMemberships",
  "dataTypes",
  "customFieldValues",
  "contactName",
  "contactRole",
  "contactEmail",
  "linkedinUrl",
  "warmIntroPossible",
  "dataIntensity",
  "competitivePressure",
  "coopLikelihood",
  "priorityScore",
  "priorityLabel",
  "industryCluster",
  "status",
  "lastContactedAt",
  "nextFollowUpAt",
  "notes",
  "hypothesis",
] as const;

export type CsvLeadRow = Record<(typeof csvHeaders)[number], string>;

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const output = String(value);
  if (/[",\n]/.test(output)) {
    return `"${output.replaceAll("\"", "\"\"")}"`;
  }
  return output;
}

export function buildLeadsCsv(rows: Array<Record<string, unknown>>): string {
  const header = csvHeaders.join(",");
  const body = rows
    .map((row) =>
      csvHeaders
        .map((key) => {
          const value =
            key === "associationMemberships" && Array.isArray(row[key])
              ? (row[key] as unknown[]).join("|")
              : key === "dataTypes" && Array.isArray(row[key])
                ? (row[key] as unknown[]).join("|")
                : key === "customFieldValues" && row[key] && typeof row[key] === "object"
                  ? JSON.stringify(row[key])
                  : row[key];
          return escapeCsv(value);
        })
        .join(","),
    )
    .join("\n");

  return `${header}\n${body}`;
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

export function parseLeadsCsv(input: string): CsvLeadRow[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headerCells = splitCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {} as CsvLeadRow;
    csvHeaders.forEach((key) => {
      const index = headerCells.indexOf(key);
      row[key] = index >= 0 ? cells[index] ?? "" : "";
    });
    return row;
  });
}

export function asPipelineStatus(value: string): PipelineStatus {
  const normalized = value.trim().toUpperCase().replaceAll(" ", "_");
  if (normalized in PipelineStatus) {
    return normalized as PipelineStatus;
  }
  return PipelineStatus.NEW;
}

export function asClusterFit(value: string): ClusterFit | null {
  const normalized = value.trim().toUpperCase();
  if (normalized in ClusterFit) {
    return normalized as ClusterFit;
  }
  return null;
}
