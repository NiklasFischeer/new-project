import { ClusterFit } from "@prisma/client";

type IndustryPlaybook = {
  reason: string;
  useCase: string;
  partnerTypes: string;
  cluster: ClusterFit;
};

const industryRules: Record<string, IndustryPlaybook> = {
  "maschinenbau": {
    reason: "distributed machine telemetry across plants can improve model quality without exposing process IP",
    useCase: "predictive maintenance and quality anomaly detection",
    partnerTypes: "OEM equipment makers, MES providers, and maintenance partners",
    cluster: ClusterFit.HIGH,
  },
  "energie": {
    reason: "critical infrastructure operators need collaborative forecasting while preserving operational security",
    useCase: "load forecasting, grid anomaly detection, and asset failure prediction",
    partnerTypes: "grid operators, smart meter providers, and forecasting consultants",
    cluster: ClusterFit.HIGH,
  },
  "automotive zulieferer": {
    reason: "suppliers benefit from shared quality signals across production lines without sharing sensitive customer data",
    useCase: "defect prediction, process drift detection, and supply-chain risk scoring",
    partnerTypes: "tier-1 suppliers, plant system integrators, and quality software vendors",
    cluster: ClusterFit.HIGH,
  },
  "lebensmittelproduktion": {
    reason: "multi-site production data can raise consistency while respecting recipe confidentiality",
    useCase: "yield optimization, quality variance prediction, and cold-chain anomaly detection",
    partnerTypes: "production sites, food safety labs, and packaging automation vendors",
    cluster: ClusterFit.MEDIUM,
  },
  "industrie 4.0 software": {
    reason: "platform players can unlock stronger benchmarks by learning across customer environments privately",
    useCase: "cross-client anomaly detection, process benchmarking, and downtime prediction",
    partnerTypes: "industrial SaaS vendors, cloud-edge providers, and system integrators",
    cluster: ClusterFit.HIGH,
  },
};

function getIndustryRule(industry: string): IndustryPlaybook {
  const normalized = industry.trim().toLowerCase();

  if (industryRules[normalized]) {
    return industryRules[normalized];
  }

  if (normalized.includes("software") || normalized.includes("saas")) {
    return {
      reason: "software providers can create stronger collaborative models without exposing tenant-level data",
      useCase: "cross-customer anomaly and demand prediction",
      partnerTypes: "data platform vendors, implementation partners, and lighthouse customers",
      cluster: ClusterFit.MEDIUM,
    };
  }

  if (normalized.includes("manufactur") || normalized.includes("produktion")) {
    return {
      reason: "production networks gain from multi-plant learning while protecting proprietary processes",
      useCase: "quality prediction and predictive maintenance",
      partnerTypes: "equipment OEMs, sensor vendors, and plant analytics teams",
      cluster: ClusterFit.HIGH,
    };
  }

  return {
    reason: "sensitive enterprise data can still be leveraged collaboratively through privacy-preserving training",
    useCase: "anomaly detection and planning optimization",
    partnerTypes: "industry associations, peer companies, and specialized data partners",
    cluster: ClusterFit.LOW,
  };
}

export function deriveIndustryCluster(industry: string, dataIntensity: number): ClusterFit {
  const rule = getIndustryRule(industry);

  if (rule.cluster === ClusterFit.HIGH && dataIntensity <= 1) {
    return ClusterFit.MEDIUM;
  }

  if (rule.cluster === ClusterFit.MEDIUM && dataIntensity <= 1) {
    return ClusterFit.LOW;
  }

  if (rule.cluster === ClusterFit.LOW && dataIntensity >= 3) {
    return ClusterFit.MEDIUM;
  }

  return rule.cluster;
}

export function generateHypothesis(input: {
  companyName: string;
  industry: string;
  dataIntensity: number;
  mlActivity: boolean;
  mlActivityDescription?: string | null;
}): string {
  const rule = getIndustryRule(input.industry);

  const mlSignal = input.mlActivity
    ? input.mlActivityDescription
      ? `Existing ML momentum (${input.mlActivityDescription}) lowers adoption friction.`
      : "Existing ML activity lowers adoption friction."
    : "A federated setup can de-risk the first production ML use cases through partner learning.";

  const dataSignal =
    input.dataIntensity >= 3
      ? "The company appears highly data-intensive, improving the probability of measurable early ROI."
      : input.dataIntensity === 2
        ? "There is enough operational data to launch a focused pilot with measurable business value."
        : "A narrow pilot should be selected first to validate value before scaling.";

  return `${input.companyName} in ${input.industry} is a strong FL candidate because ${rule.reason}. Likely use case: ${rule.useCase}. Potential partners: ${rule.partnerTypes}. ${dataSignal} ${mlSignal}`;
}
