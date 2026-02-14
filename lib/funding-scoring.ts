import { ClusterFit } from "@prisma/client";

export type FundingScoreDimensions = {
  stageMatch: number;
  thesisMatch: number;
  geoMatch: number;
  ticketMatch: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function calculateFundingFitScore(input: FundingScoreDimensions): number {
  return (
    clamp(input.stageMatch, 0, 3) +
    clamp(input.thesisMatch, 0, 3) +
    clamp(input.geoMatch, 0, 2) +
    clamp(input.ticketMatch, 0, 2)
  );
}

export function calculateFundingPriority(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score <= 2) return 1;
  if (score <= 4) return 2;
  if (score <= 6) return 3;
  if (score <= 8) return 4;
  return 5;
}

export function deriveFundingFitCluster(score: number): ClusterFit {
  if (score >= 8) return ClusterFit.HIGH;
  if (score >= 5) return ClusterFit.MEDIUM;
  return ClusterFit.LOW;
}
