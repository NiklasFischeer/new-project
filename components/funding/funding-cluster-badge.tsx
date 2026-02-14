import { ClusterFit } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

type FundingClusterBadgeProps = {
  cluster: ClusterFit;
};

const labels: Record<ClusterFit, string> = {
  HIGH: "High Fit",
  MEDIUM: "Medium Fit",
  LOW: "Low Fit",
};

export function FundingClusterBadge({ cluster }: FundingClusterBadgeProps) {
  const tone = cluster === "HIGH" ? "success" : cluster === "MEDIUM" ? "warning" : "secondary";
  return <Badge variant={tone}>{labels[cluster]}</Badge>;
}
