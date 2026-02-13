import { PipelineStatus } from "@prisma/client";

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
