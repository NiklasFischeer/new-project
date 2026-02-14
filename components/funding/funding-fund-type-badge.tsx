import { FundingFundType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { fundingFundTypeLabels } from "@/lib/constants";

type FundingFundTypeBadgeProps = {
  fundType: FundingFundType;
};

export function FundingFundTypeBadge({ fundType }: FundingFundTypeBadgeProps) {
  const tone =
    fundType === "GRANT" || fundType === "PUBLIC_PROGRAM"
      ? "warning"
      : fundType === "VC" || fundType === "CVC"
        ? "default"
        : "secondary";

  return <Badge variant={tone}>{fundingFundTypeLabels[fundType]}</Badge>;
}
