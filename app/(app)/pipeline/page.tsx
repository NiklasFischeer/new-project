import { PipelineBoardClient } from "@/components/pipeline/pipeline-board-client";
import { getLeads } from "@/lib/server";
import { serializeLeads } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const leads = await getLeads();
  const serialized = serializeLeads(leads);

  return <PipelineBoardClient initialLeads={serialized} />;
}
