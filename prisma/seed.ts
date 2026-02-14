import { FundingFundType, FundingStatus, FundingTargetStage, PipelineStatus, FundingStage, PrismaClient } from "@prisma/client";
import { calculatePriorityLabel, calculatePriorityScore } from "../lib/scoring";
import { deriveIndustryCluster, generateHypothesis } from "../lib/hypothesis";
import { calculateFundingFitScore, calculateFundingPriority, deriveFundingFitCluster } from "../lib/funding-scoring";

const prisma = new PrismaClient();

type SeedLead = {
  companyName: string;
  industry: string;
  sizeEmployees: number;
  digitalMaturity: number;
  mlActivity: boolean;
  mlActivityDescription?: string;
  associationMemberships: string[];
  dataTypes?: string[];
  customFieldValues?: Record<string, string>;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  linkedinUrl: string;
  warmIntroPossible: boolean;
  dataIntensity: number;
  competitivePressure: number;
  coopLikelihood: number;
  status: PipelineStatus;
  nextFollowUpAt?: Date;
  lastContactedAt?: Date;
  notes?: string;
};

type SeedFundingLead = {
  name: string;
  fundType: FundingFundType;
  category?: string;
  primaryContactName?: string;
  primaryContactRole?: string;
  contactEmail?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  stageFocus: FundingStage[];
  targetStage: FundingTargetStage;
  ticketMin?: number;
  ticketMax?: number;
  currency?: string;
  typicalInstrument?: string;
  grantDeadline?: Date;
  grantRequirements?: string;
  thesisTags: string[];
  industryFocus: string[];
  geoFocus: string[];
  warmIntroPossible: boolean;
  introPath?: string;
  stageMatch: number;
  thesisMatch: number;
  geoMatch: number;
  ticketMatch: number;
  status: FundingStatus;
  firstContactedAt?: Date;
  lastContactedAt?: Date;
  nextFollowUpAt?: Date;
  cadenceStep?: number;
  outcomeNotes?: string;
  owner?: string;
  sourceText?: string;
  sourceUrl?: string;
  lastVerifiedAt?: Date;
  notes?: string;
};

const leads: SeedLead[] = [
  {
    companyName: "Krauss & Sohn Maschinenbau GmbH",
    industry: "Maschinenbau",
    sizeEmployees: 420,
    digitalMaturity: 2,
    mlActivity: true,
    mlActivityDescription: "Pilot for anomaly detection on CNC lines",
    associationMemberships: ["VDMA", "Bitkom"],
    dataTypes: ["Sensor data", "Maintenance logs", "Quality images"],
    customFieldValues: {
      "Data Owner": "Head of Manufacturing Analytics",
      "System Landscape": "MES + SAP",
    },
    contactName: "Mara Voigt",
    contactRole: "Leitung Digitalisierung",
    contactEmail: "m.voigt@krauss-sohn.de",
    linkedinUrl: "https://www.linkedin.com/in/mara-voigt",
    warmIntroPossible: true,
    dataIntensity: 3,
    competitivePressure: 2,
    coopLikelihood: 2,
    status: PipelineStatus.CONTACTED,
    lastContactedAt: new Date("2026-02-03"),
    nextFollowUpAt: new Date("2026-02-18"),
    notes: "Strong interest in privacy-preserving multi-site model training.",
  },
  {
    companyName: "NordWerk Precision Systems",
    industry: "Maschinenbau",
    sizeEmployees: 260,
    digitalMaturity: 1,
    mlActivity: false,
    associationMemberships: ["VDMA"],
    dataTypes: ["Machine telemetry", "SCADA events"],
    customFieldValues: {
      "Data Owner": "Plant IT",
      "System Landscape": "SCADA + ERP",
    },
    contactName: "Jonas Feld",
    contactRole: "Werksleiter",
    contactEmail: "jonas.feld@nordwerk.de",
    linkedinUrl: "https://www.linkedin.com/in/jonas-feld",
    warmIntroPossible: false,
    dataIntensity: 2,
    competitivePressure: 2,
    coopLikelihood: 1,
    status: PipelineStatus.NEW,
    nextFollowUpAt: new Date("2026-02-20"),
    notes: "Needs concrete ROI benchmark examples.",
  },
  {
    companyName: "EnergieNetz Süd AG",
    industry: "Energie",
    sizeEmployees: 870,
    digitalMaturity: 3,
    mlActivity: true,
    mlActivityDescription: "Forecasting project for grid balancing",
    associationMemberships: ["BDEW"],
    dataTypes: ["Smart meter data", "Grid load series", "Weather data"],
    customFieldValues: {
      "Data Owner": "Data & Innovation",
      "System Landscape": "OT historian + cloud warehouse",
    },
    contactName: "Dr. Lena Hartig",
    contactRole: "Head of Data & Innovation",
    contactEmail: "l.hartig@energienetz-sued.de",
    linkedinUrl: "https://www.linkedin.com/in/lena-hartig",
    warmIntroPossible: true,
    dataIntensity: 3,
    competitivePressure: 1,
    coopLikelihood: 2,
    status: PipelineStatus.REPLIED,
    lastContactedAt: new Date("2026-02-07"),
    nextFollowUpAt: new Date("2026-02-15"),
    notes: "Legal team asked about data residency and governance model.",
  },
  {
    companyName: "RheinVolt Utility Services",
    industry: "Energie",
    sizeEmployees: 510,
    digitalMaturity: 2,
    mlActivity: false,
    associationMemberships: ["BDEW", "VKU"],
    dataTypes: ["Asset telemetry", "Outage logs"],
    customFieldValues: {
      "Data Owner": "Operations Planning",
      "System Landscape": "Legacy DMS + BI",
    },
    contactName: "Tobias Engel",
    contactRole: "Strategic Partnerships",
    contactEmail: "t.engel@rheinvolt.de",
    linkedinUrl: "https://www.linkedin.com/in/tobias-engel",
    warmIntroPossible: true,
    dataIntensity: 2,
    competitivePressure: 1,
    coopLikelihood: 2,
    status: PipelineStatus.INTERVIEW,
    lastContactedAt: new Date("2026-02-01"),
    nextFollowUpAt: new Date("2026-02-16"),
  },
  {
    companyName: "AutoForge Komponenten GmbH",
    industry: "Automotive Zulieferer",
    sizeEmployees: 640,
    digitalMaturity: 2,
    mlActivity: true,
    mlActivityDescription: "Vision-based defect detection on weld seams",
    associationMemberships: ["VDA"],
    dataTypes: ["Vision images", "Line sensor data", "Quality reports"],
    customFieldValues: {
      "Data Owner": "Quality Engineering",
      "System Landscape": "MES + Data Lake",
    },
    contactName: "Svenja Albrecht",
    contactRole: "Director Operational Excellence",
    contactEmail: "s.albrecht@autoforge.de",
    linkedinUrl: "https://www.linkedin.com/in/svenja-albrecht",
    warmIntroPossible: false,
    dataIntensity: 3,
    competitivePressure: 2,
    coopLikelihood: 1,
    status: PipelineStatus.PILOT_CANDIDATE,
    lastContactedAt: new Date("2026-02-04"),
    nextFollowUpAt: new Date("2026-02-17"),
    notes: "Security review pending from Tier-1 client IT.",
  },
  {
    companyName: "Bavaria Motion Parts",
    industry: "Automotive Zulieferer",
    sizeEmployees: 350,
    digitalMaturity: 1,
    mlActivity: false,
    associationMemberships: ["VDA", "BayME"],
    dataTypes: ["Process telemetry", "Supplier quality events"],
    customFieldValues: {
      "Data Owner": "Production Excellence",
      "System Landscape": "ERP + Excel workflows",
    },
    contactName: "Can Yildiz",
    contactRole: "Leiter Produktion",
    contactEmail: "can.yildiz@bavaria-motion.de",
    linkedinUrl: "https://www.linkedin.com/in/can-yildiz",
    warmIntroPossible: false,
    dataIntensity: 2,
    competitivePressure: 2,
    coopLikelihood: 1,
    status: PipelineStatus.CONTACTED,
    nextFollowUpAt: new Date("2026-02-19"),
  },
  {
    companyName: "FrischeQuelle Lebensmittelwerke",
    industry: "Lebensmittelproduktion",
    sizeEmployees: 290,
    digitalMaturity: 1,
    mlActivity: false,
    associationMemberships: ["BVE"],
    dataTypes: ["Batch logs", "Lab quality measurements"],
    customFieldValues: {
      "Data Owner": "Quality Assurance",
      "System Landscape": "LIMS + ERP",
    },
    contactName: "Nina Wolter",
    contactRole: "Leitung Qualitätssicherung",
    contactEmail: "n.wolter@frischequelle.de",
    linkedinUrl: "https://www.linkedin.com/in/nina-wolter",
    warmIntroPossible: true,
    dataIntensity: 2,
    competitivePressure: 2,
    coopLikelihood: 2,
    status: PipelineStatus.NEW,
    nextFollowUpAt: new Date("2026-02-21"),
    notes: "Open to consortium pilot with two partner plants.",
  },
  {
    companyName: "NordMahl Food Systems",
    industry: "Lebensmittelproduktion",
    sizeEmployees: 180,
    digitalMaturity: 2,
    mlActivity: true,
    mlActivityDescription: "Batch yield prediction in baking lines",
    associationMemberships: ["BVE", "DIL"],
    dataTypes: ["Recipe metadata", "IoT sensor data", "Yield reports"],
    customFieldValues: {
      "Data Owner": "Data Product Team",
      "System Landscape": "Cloud warehouse + edge collectors",
    },
    contactName: "Oliver Stein",
    contactRole: "Data Product Manager",
    contactEmail: "o.stein@nordmahl.de",
    linkedinUrl: "https://www.linkedin.com/in/oliver-stein",
    warmIntroPossible: true,
    dataIntensity: 2,
    competitivePressure: 1,
    coopLikelihood: 2,
    status: PipelineStatus.REPLIED,
    lastContactedAt: new Date("2026-02-06"),
    nextFollowUpAt: new Date("2026-02-14"),
  },
  {
    companyName: "SynFactory Cloud GmbH",
    industry: "Industrie 4.0 Software",
    sizeEmployees: 130,
    digitalMaturity: 3,
    mlActivity: true,
    mlActivityDescription: "MLOps stack for distributed factory analytics",
    associationMemberships: ["Bitkom", "Plattform Industrie 4.0"],
    dataTypes: ["Client telemetry", "Machine events", "Model metrics"],
    customFieldValues: {
      "Data Owner": "CTO Office",
      "System Landscape": "Kubernetes + MLOps stack",
    },
    contactName: "Pauline Rieger",
    contactRole: "CEO",
    contactEmail: "pauline.rieger@synfactory.cloud",
    linkedinUrl: "https://www.linkedin.com/in/pauline-rieger",
    warmIntroPossible: true,
    dataIntensity: 3,
    competitivePressure: 2,
    coopLikelihood: 2,
    status: PipelineStatus.PILOT_RUNNING,
    lastContactedAt: new Date("2026-02-05"),
    nextFollowUpAt: new Date("2026-02-13"),
    notes: "Potential lighthouse customer for joint case study.",
  },
  {
    companyName: "WerkPulse Analytics",
    industry: "Industrie 4.0 Software",
    sizeEmployees: 95,
    digitalMaturity: 2,
    mlActivity: true,
    mlActivityDescription: "Cross-site anomaly dashboards",
    associationMemberships: ["Bitkom"],
    dataTypes: ["Anomaly events", "Sensor time series"],
    customFieldValues: {
      "Data Owner": "Partnership Analytics",
      "System Landscape": "SaaS platform + warehouse",
    },
    contactName: "Leonie Brandt",
    contactRole: "VP Partnerships",
    contactEmail: "leonie.brandt@werkpulse.io",
    linkedinUrl: "https://www.linkedin.com/in/leonie-brandt",
    warmIntroPossible: true,
    dataIntensity: 2,
    competitivePressure: 1,
    coopLikelihood: 2,
    status: PipelineStatus.WON,
    lastContactedAt: new Date("2026-01-28"),
    nextFollowUpAt: new Date("2026-03-01"),
  },
];

const fundingLeads: SeedFundingLead[] = [
  {
    name: "Speedinvest",
    fundType: FundingFundType.VC,
    category: "EU / DACH",
    primaryContactName: "Anna Keller",
    primaryContactRole: "Partner",
    contactEmail: "anna@speedinvest.com",
    linkedinUrl: "https://www.linkedin.com/in/anna-keller",
    websiteUrl: "https://www.speedinvest.com",
    stageFocus: [FundingStage.PRE_SEED, FundingStage.SEED],
    targetStage: FundingTargetStage.PRE_SEED,
    ticketMin: 500000,
    ticketMax: 3000000,
    currency: "EUR",
    typicalInstrument: "equity / SAFE",
    thesisTags: ["AI", "Federated Learning", "B2B SaaS", "Data Infrastructure"],
    industryFocus: ["Manufacturing", "Energy"],
    geoFocus: ["AT", "DE", "EU"],
    warmIntroPossible: true,
    introPath: "via portfolio founder referral",
    stageMatch: 3,
    thesisMatch: 3,
    geoMatch: 2,
    ticketMatch: 2,
    status: FundingStatus.WARM_INTRO,
    lastContactedAt: new Date("2026-02-10"),
    nextFollowUpAt: new Date("2026-02-18"),
    owner: "Niklas",
    sourceText: "Crunchbase + founder network",
    sourceUrl: "https://www.crunchbase.com/organization/speedinvest",
    lastVerifiedAt: new Date("2026-02-11"),
  },
  {
    name: "HV Capital",
    fundType: FundingFundType.VC,
    category: "Germany",
    primaryContactName: "Moritz Hahn",
    primaryContactRole: "Principal",
    contactEmail: "moritz@hvcapital.com",
    linkedinUrl: "https://www.linkedin.com/in/moritz-hahn",
    websiteUrl: "https://www.hvcapital.com",
    stageFocus: [FundingStage.SEED, FundingStage.SERIES_A],
    targetStage: FundingTargetStage.SEED,
    ticketMin: 1000000,
    ticketMax: 5000000,
    currency: "EUR",
    typicalInstrument: "equity",
    thesisTags: ["AI", "ML", "Industrial"],
    industryFocus: ["Manufacturing", "Logistics"],
    geoFocus: ["DE", "EU"],
    warmIntroPossible: false,
    stageMatch: 2,
    thesisMatch: 2,
    geoMatch: 2,
    ticketMatch: 1,
    status: FundingStatus.RESEARCHED,
    nextFollowUpAt: new Date("2026-02-25"),
    owner: "Niklas",
    sourceText: "Website research",
    sourceUrl: "https://www.hvcapital.com",
    lastVerifiedAt: new Date("2026-02-08"),
  },
  {
    name: "AWS Pre-Seed Program",
    fundType: FundingFundType.GRANT,
    category: "EU-wide",
    primaryContactName: "Program Office",
    primaryContactRole: "Program Manager",
    contactEmail: "programs@aws.amazon.com",
    websiteUrl: "https://aws.amazon.com/startups",
    stageFocus: [FundingStage.IDEA, FundingStage.PRE_SEED, FundingStage.SEED],
    targetStage: FundingTargetStage.PRE_SEED,
    ticketMin: 10000,
    ticketMax: 100000,
    currency: "EUR",
    typicalInstrument: "grant credits",
    grantDeadline: new Date("2026-04-30"),
    grantRequirements: "EU entity, technical roadmap, cloud architecture scope.",
    thesisTags: ["AI", "ML", "Data Infrastructure"],
    industryFocus: ["Manufacturing", "Energy", "Healthcare"],
    geoFocus: ["EU", "Global"],
    warmIntroPossible: false,
    stageMatch: 3,
    thesisMatch: 2,
    geoMatch: 2,
    ticketMatch: 1,
    status: FundingStatus.CONTACTED,
    firstContactedAt: new Date("2026-02-05"),
    lastContactedAt: new Date("2026-02-12"),
    nextFollowUpAt: new Date("2026-02-19"),
    cadenceStep: 1,
    owner: "Niklas",
    sourceText: "AWS startup page",
    sourceUrl: "https://aws.amazon.com/startups",
    lastVerifiedAt: new Date("2026-02-12"),
  },
  {
    name: "FFG Basisprogramm",
    fundType: FundingFundType.PUBLIC_PROGRAM,
    category: "Austria",
    primaryContactName: "Förderberatung Team",
    primaryContactRole: "Programmstelle",
    contactEmail: "info@ffg.at",
    websiteUrl: "https://www.ffg.at",
    stageFocus: [FundingStage.PRE_SEED, FundingStage.SEED, FundingStage.SERIES_A],
    targetStage: FundingTargetStage.SEED,
    ticketMin: 50000,
    ticketMax: 500000,
    currency: "EUR",
    typicalInstrument: "grant + loan mix",
    grantDeadline: new Date("2026-05-31"),
    grantRequirements: "TRL > 4, Austrian entity, innovation impact narrative.",
    thesisTags: ["DeepTech", "Industrial", "Federated Learning"],
    industryFocus: ["Manufacturing", "Energy", "Public Sector"],
    geoFocus: ["AT", "EU"],
    warmIntroPossible: true,
    introPath: "via Wirtschaftsagentur Wien",
    stageMatch: 2,
    thesisMatch: 3,
    geoMatch: 2,
    ticketMatch: 2,
    status: FundingStatus.MEETING_BOOKED,
    firstContactedAt: new Date("2026-02-03"),
    lastContactedAt: new Date("2026-02-09"),
    nextFollowUpAt: new Date("2026-02-16"),
    cadenceStep: 2,
    owner: "Niklas",
    sourceText: "FFG website",
    sourceUrl: "https://www.ffg.at/basisprogramm",
    lastVerifiedAt: new Date("2026-02-09"),
    notes: "Need consortium option check.",
  },
  {
    name: "Techstars AI Accelerator",
    fundType: FundingFundType.ACCELERATOR,
    category: "Global",
    primaryContactName: "Selection Committee",
    primaryContactRole: "Program Team",
    contactEmail: "apply@techstars.com",
    websiteUrl: "https://www.techstars.com",
    stageFocus: [FundingStage.PRE_SEED, FundingStage.SEED],
    targetStage: FundingTargetStage.PRE_SEED,
    ticketMin: 120000,
    ticketMax: 120000,
    currency: "USD",
    typicalInstrument: "equity + program",
    thesisTags: ["AI", "B2B SaaS", "Data Infrastructure"],
    industryFocus: ["Manufacturing", "Energy", "Logistics"],
    geoFocus: ["Global"],
    warmIntroPossible: false,
    stageMatch: 3,
    thesisMatch: 2,
    geoMatch: 1,
    ticketMatch: 2,
    status: FundingStatus.NEW,
    nextFollowUpAt: new Date("2026-02-28"),
    owner: "Niklas",
    sourceText: "Techstars program page",
    sourceUrl: "https://www.techstars.com/accelerators",
    lastVerifiedAt: new Date("2026-02-13"),
  },
];

async function main() {
  const seedLeadsEnabled = process.env.SEED_LEADS === "true";
  const seedFundingEnabled = process.env.SEED_FUNDING === "true";

  if (!seedLeadsEnabled && !seedFundingEnabled) {
    console.info("Seed skipped: set SEED_LEADS=true and/or SEED_FUNDING=true to seed demo data.");
    return;
  }

  const [existingLeadCount, existingFundingCount] = await Promise.all([
    prisma.lead.count(),
    prisma.fundingLead.count(),
  ]);

  if (seedLeadsEnabled && existingLeadCount === 0) {
    await prisma.customFieldDefinition.upsert({
      where: { name: "Data Owner" },
      update: {},
      create: { name: "Data Owner" },
    });
    await prisma.customFieldDefinition.upsert({
      where: { name: "System Landscape" },
      update: {},
      create: { name: "System Landscape" },
    });

    for (const lead of leads) {
      const priorityScore = calculatePriorityScore(lead);
      const priorityLabel = calculatePriorityLabel(priorityScore);
      const industryCluster = deriveIndustryCluster(lead.industry, lead.dataIntensity);
      const hypothesis = generateHypothesis({
        companyName: lead.companyName,
        industry: lead.industry,
        dataIntensity: lead.dataIntensity,
        mlActivity: lead.mlActivity,
        mlActivityDescription: lead.mlActivityDescription,
      });

      await prisma.lead.create({
        data: {
          companyName: lead.companyName,
          industry: lead.industry,
          sizeEmployees: lead.sizeEmployees,
          digitalMaturity: lead.digitalMaturity,
          mlActivity: lead.mlActivity,
          mlActivityDescription: lead.mlActivityDescription,
          associationMemberships: lead.associationMemberships,
          dataTypes: lead.dataTypes ?? [],
          contactName: lead.contactName,
          contactRole: lead.contactRole,
          contactEmail: lead.contactEmail,
          linkedinUrl: lead.linkedinUrl,
          warmIntroPossible: lead.warmIntroPossible,
          dataIntensity: lead.dataIntensity,
          competitivePressure: lead.competitivePressure,
          coopLikelihood: lead.coopLikelihood,
          priorityScore,
          priorityLabel,
          hypothesis,
          industryCluster,
          status: lead.status,
          lastContactedAt: lead.lastContactedAt,
          nextFollowUpAt: lead.nextFollowUpAt,
          notes: lead.notes,
          customFieldValues: lead.customFieldValues ?? {},
        },
      });
    }

    console.info(`Seeded ${leads.length} leads.`);
  } else if (seedLeadsEnabled) {
    console.info("Lead seed skipped: lead table already contains data.");
  } else {
    console.info("Lead seed skipped: SEED_LEADS=true not set.");
  }

  if (seedFundingEnabled && existingFundingCount === 0) {
    for (const fundingLead of fundingLeads) {
      const fitScore = calculateFundingFitScore(fundingLead);
      const priority = calculateFundingPriority(fitScore);
      const fitCluster = deriveFundingFitCluster(fitScore);

      await prisma.fundingLead.create({
        data: {
          ...fundingLead,
          fitScore,
          priority,
          fitCluster,
          currency: fundingLead.currency ?? "EUR",
        },
      });
    }

    console.info(`Seeded ${fundingLeads.length} funding leads.`);
  } else if (seedFundingEnabled) {
    console.info("Funding seed skipped: funding lead table already contains data.");
  } else {
    console.info("Funding seed skipped: SEED_FUNDING=true not set.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
