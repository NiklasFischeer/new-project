-- CreateEnum
CREATE TYPE "FundingFundType" AS ENUM ('VC', 'CVC', 'ANGEL', 'ANGEL_NETWORK', 'ACCELERATOR', 'INCUBATOR', 'GRANT', 'PUBLIC_PROGRAM', 'COMPETITION', 'VENTURE_DEBT', 'OTHER');

-- CreateEnum
CREATE TYPE "FundingStatus" AS ENUM ('NEW', 'RESEARCHED', 'WARM_INTRO', 'CONTACTED', 'MEETING_BOOKED', 'IN_PROCESS_DD', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "FundingStage" AS ENUM ('IDEA', 'PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B_PLUS', 'GROWTH', 'ANY');

-- CreateEnum
CREATE TYPE "FundingTargetStage" AS ENUM ('PRE_SEED', 'SEED', 'SERIES_A');

-- CreateEnum
CREATE TYPE "FundingReasonLost" AS ENUM ('NO_FIT', 'NOT_NOW', 'NO_RESPONSE', 'REJECTED', 'OTHER');

-- CreateEnum
CREATE TYPE "FundingEmailStyle" AS ENUM ('SHORT', 'MEDIUM', 'TECHNICAL', 'GRANT');

-- CreateTable
CREATE TABLE "FundingLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fundType" "FundingFundType" NOT NULL,
    "category" TEXT,
    "primaryContactName" TEXT,
    "primaryContactRole" TEXT,
    "contactEmail" TEXT,
    "linkedinUrl" TEXT,
    "websiteUrl" TEXT,
    "stageFocus" "FundingStage"[] DEFAULT ARRAY[]::"FundingStage"[],
    "targetStage" "FundingTargetStage" NOT NULL DEFAULT 'PRE_SEED',
    "ticketMin" INTEGER,
    "ticketMax" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "typicalInstrument" TEXT,
    "grantDeadline" TIMESTAMP(3),
    "grantRequirements" TEXT,
    "thesisTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "industryFocus" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "geoFocus" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "warmIntroPossible" BOOLEAN NOT NULL DEFAULT false,
    "introPath" TEXT,
    "stageMatch" INTEGER NOT NULL DEFAULT 0,
    "thesisMatch" INTEGER NOT NULL DEFAULT 0,
    "geoMatch" INTEGER NOT NULL DEFAULT 0,
    "ticketMatch" INTEGER NOT NULL DEFAULT 0,
    "fitScore" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "fitCluster" "ClusterFit" NOT NULL DEFAULT 'LOW',
    "fitClusterOverride" "ClusterFit",
    "status" "FundingStatus" NOT NULL DEFAULT 'NEW',
    "firstContactedAt" TIMESTAMP(3),
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "cadenceStep" INTEGER,
    "outcomeNotes" TEXT,
    "reasonLost" "FundingReasonLost",
    "objections" TEXT,
    "nextSteps" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "owner" TEXT,
    "sourceText" TEXT,
    "sourceUrl" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingEmailDraft" (
    "id" TEXT NOT NULL,
    "fundingLeadId" TEXT NOT NULL,
    "style" "FundingEmailStyle" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundingEmailDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FundingLead_fundType_idx" ON "FundingLead"("fundType");

-- CreateIndex
CREATE INDEX "FundingLead_status_idx" ON "FundingLead"("status");

-- CreateIndex
CREATE INDEX "FundingLead_priority_idx" ON "FundingLead"("priority");

-- CreateIndex
CREATE INDEX "FundingLead_fitScore_idx" ON "FundingLead"("fitScore");

-- CreateIndex
CREATE INDEX "FundingLead_nextFollowUpAt_idx" ON "FundingLead"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "FundingEmailDraft_fundingLeadId_idx" ON "FundingEmailDraft"("fundingLeadId");

-- AddForeignKey
ALTER TABLE "FundingEmailDraft" ADD CONSTRAINT "FundingEmailDraft_fundingLeadId_fkey" FOREIGN KEY ("fundingLeadId") REFERENCES "FundingLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
