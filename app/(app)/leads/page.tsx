import { LeadsTableClient } from "@/components/leads/leads-table-client";
import { getCustomFieldDefinitions, getLeads } from "@/lib/server";
import { serializeLeads } from "@/lib/serialize";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  cluster?: string;
}>;

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;
  const [leads, customFields] = await Promise.all([
    getLeads({
      query: resolved.q,
      status: resolved.status,
      cluster: resolved.cluster,
    }),
    getCustomFieldDefinitions(),
  ]);

  const serialized = serializeLeads(leads);
  const serializedFields = customFields.map((field) => ({
    ...field,
    createdAt: field.createdAt.toISOString(),
    updatedAt: field.updatedAt.toISOString(),
  }));

  return <LeadsTableClient initialLeads={serialized} initialQuery={resolved.q} initialCustomFields={serializedFields} />;
}
