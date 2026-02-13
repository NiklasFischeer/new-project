import { ClusterFit } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { clusterLabel } from "@/lib/constants";

type ClusterBadgeProps = {
  cluster: ClusterFit;
};

export function ClusterBadge({ cluster }: ClusterBadgeProps) {
  const variant = cluster === "HIGH" ? "success" : cluster === "MEDIUM" ? "warning" : "secondary";
  return <Badge variant={variant}>{clusterLabel[cluster]}</Badge>;
}
