import { PipelineStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { pipelineLabels } from "@/lib/constants";

export function StatusBadge({ status }: { status: PipelineStatus }) {
  const variant = status === "WON" ? "success" : status === "LOST" ? "danger" : "outline";
  return <Badge variant={variant}>{pipelineLabels[status]}</Badge>;
}
