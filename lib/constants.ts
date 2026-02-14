import { FundingFundType, FundingStage, FundingStatus, PipelineStatus } from "@prisma/client";

export const pipelineOrder: PipelineStatus[] = [
  PipelineStatus.NEW,
  PipelineStatus.CONTACTED,
  PipelineStatus.REPLIED,
  PipelineStatus.INTERVIEW,
  PipelineStatus.PILOT_CANDIDATE,
  PipelineStatus.PILOT_RUNNING,
  PipelineStatus.WON,
  PipelineStatus.LOST,
];

export const pipelineLabels: Record<PipelineStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  REPLIED: "Replied",
  INTERVIEW: "Interview",
  PILOT_CANDIDATE: "Pilot Candidate",
  PILOT_RUNNING: "Pilot Running",
  WON: "Won",
  LOST: "Lost",
};

export const clusterLabel = {
  HIGH: "High fit",
  MEDIUM: "Medium fit",
  LOW: "Low fit",
} as const;

export const fundingStatusOrder: FundingStatus[] = [
  "NEW",
  "RESEARCHED",
  "WARM_INTRO",
  "CONTACTED",
  "MEETING_BOOKED",
  "IN_PROCESS_DD",
  "WON",
  "LOST",
];

export const fundingStatusLabels: Record<FundingStatus, string> = {
  NEW: "New",
  RESEARCHED: "Researched",
  WARM_INTRO: "Warm Intro",
  CONTACTED: "Contacted",
  MEETING_BOOKED: "Meeting Booked",
  IN_PROCESS_DD: "In Process / DD",
  WON: "Won",
  LOST: "Lost",
};

export const fundingFundTypeLabels: Record<FundingFundType, string> = {
  VC: "VC",
  CVC: "CVC",
  ANGEL: "Angel",
  ANGEL_NETWORK: "Angel Network",
  ACCELERATOR: "Accelerator",
  INCUBATOR: "Incubator",
  GRANT: "Grant",
  PUBLIC_PROGRAM: "Public Program",
  COMPETITION: "Competition",
  VENTURE_DEBT: "Venture Debt",
  OTHER: "Other",
};

export const fundingStageLabels: Record<FundingStage, string> = {
  IDEA: "Idea",
  PRE_SEED: "Pre-Seed",
  SEED: "Seed",
  SERIES_A: "Series A",
  SERIES_B_PLUS: "Series B+",
  GROWTH: "Growth",
  ANY: "Any",
};
