import { Badge } from "@/components/ui/badge";

type PriorityBadgeProps = {
  score: number;
  label: number;
};

export function PriorityBadge({ score, label }: PriorityBadgeProps) {
  const variant = label >= 4 ? "success" : label === 3 ? "warning" : "secondary";

  return <Badge variant={variant}>P{label} · Score {score}</Badge>;
}
