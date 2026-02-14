import {
  ClusterFit,
  EmailStyle,
  FundingEmailStyle,
  FundingFundType,
  FundingReasonLost,
  FundingStatus,
  FundingTargetStage,
  PipelineStatus,
} from "@prisma/client";

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

export type FundingEmailDraftRecord = {
  id: string;
  fundingLeadId: string;
  style: FundingEmailStyle;
  subject: string;
  body: string;
  createdAt: string;
};

export type FundingLeadWithDrafts = {
  id: string;
  name: string;
  fundType: FundingFundType;
  category: string | null;
  primaryContactName: string | null;
  primaryContactRole: string | null;
  contactEmail: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  stageFocus: string[];
  targetStage: FundingTargetStage;
  ticketMin: number | null;
  ticketMax: number | null;
  currency: string;
  typicalInstrument: string | null;
  grantDeadline: string | null;
  grantRequirements: string | null;
  thesisTags: string[];
  industryFocus: string[];
  geoFocus: string[];
  warmIntroPossible: boolean;
  introPath: string | null;
  stageMatch: number;
  thesisMatch: number;
  geoMatch: number;
  ticketMatch: number;
  fitScore: number;
  priority: number;
  fitCluster: ClusterFit;
  fitClusterOverride: ClusterFit | null;
  status: FundingStatus;
  firstContactedAt: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  cadenceStep: number | null;
  outcomeNotes: string | null;
  reasonLost: FundingReasonLost | null;
  objections: string | null;
  nextSteps: string | null;
  attachments: string[];
  owner: string | null;
  sourceText: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  emailDrafts: FundingEmailDraftRecord[];
};
