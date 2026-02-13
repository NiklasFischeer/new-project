import { ClusterFit, EmailStyle, PipelineStatus } from "@prisma/client";

export type EmailDraftRecord = {
  id: string;
  leadId: string;
  style: EmailStyle;
  subject: string;
  body: string;
  createdAt: string;
};

export type CustomFieldDefinitionRecord = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadWithDrafts = {
  id: string;
  companyName: string;
  industry: string;
  sizeEmployees: number;
  digitalMaturity: number;
  mlActivity: boolean;
  mlActivityDescription: string | null;
  associationMemberships: string[];
  contactName: string;
  contactRole: string;
  contactEmail: string;
  linkedinUrl: string | null;
  warmIntroPossible: boolean;
  dataTypes: string[];
  dataIntensity: number;
  competitivePressure: number;
  coopLikelihood: number;
  priorityScore: number;
  priorityLabel: number;
  hypothesis: string;
  industryCluster: ClusterFit;
  clusterOverride: ClusterFit | null;
  status: PipelineStatus;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  notes: string | null;
  customFieldValues: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  emailDrafts: EmailDraftRecord[];
};
