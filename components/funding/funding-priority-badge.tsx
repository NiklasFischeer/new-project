import { Badge } from "@/components/ui/badge";

type FundingPriorityBadgeProps = {
  score: number;
  priority: number;
};

export function FundingPriorityBadge({ score, priority }: FundingPriorityBadgeProps) {
  const tone = priority >= 4 ? "success" : priority === 3 ? "warning" : "secondary";
  return <Badge variant={tone}>{`Fit ${score}/10 · Prio ${priority}/5`}</Badge>;
}
