import { FundingStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { fundingStatusLabels } from "@/lib/constants";

type FundingStatusBadgeProps = {
  status: FundingStatus;
};

export function FundingStatusBadge({ status }: FundingStatusBadgeProps) {
  const tone =
    status === "WON"
      ? "success"
      : status === "LOST"
        ? "danger"
        : status === "MEETING_BOOKED" || status === "IN_PROCESS_DD"
          ? "warning"
          : "secondary";

  return <Badge variant={tone}>{fundingStatusLabels[status]}</Badge>;
}
