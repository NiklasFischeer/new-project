import { Badge } from "@/components/ui/badge";

type FundingPriorityBadgeProps = {
  score: number;
  priority: number;
};

export function FundingPriorityBadge({ score, priority }: FundingPriorityBadgeProps) {
  const tone = priority >= 4 ? "success" : priority === 3 ? "warning" : "secondary";
  return <Badge variant={tone} className="whitespace-nowrap">{`Score ${score}/10 · P${priority}`}</Badge>;
}
