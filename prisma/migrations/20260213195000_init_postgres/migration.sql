-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('NEW', 'CONTACTED', 'REPLIED', 'INTERVIEW', 'PILOT_CANDIDATE', 'PILOT_RUNNING', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ClusterFit" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "EmailStyle" AS ENUM ('SHORT', 'MEDIUM', 'TECHNICAL');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "sizeEmployees" INTEGER NOT NULL,
    "digitalMaturity" INTEGER NOT NULL,
    "mlActivity" BOOLEAN NOT NULL DEFAULT false,
    "mlActivityDescription" TEXT,
    "associationMemberships" JSONB,
    "contactName" TEXT NOT NULL,
    "contactRole" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "warmIntroPossible" BOOLEAN NOT NULL DEFAULT false,
    "dataTypes" JSONB,
    "dataIntensity" INTEGER NOT NULL,
    "competitivePressure" INTEGER NOT NULL,
    "coopLikelihood" INTEGER NOT NULL,
    "priorityScore" INTEGER NOT NULL,
    "priorityLabel" INTEGER NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "industryCluster" "ClusterFit" NOT NULL,
    "clusterOverride" "ClusterFit",
    "status" "PipelineStatus" NOT NULL DEFAULT 'NEW',
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "notes" TEXT,
    "customFieldValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDraft" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "style" "EmailStyle" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_priorityScore_idx" ON "Lead"("priorityScore");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_name_key" ON "CustomFieldDefinition"("name");

-- CreateIndex
CREATE INDEX "EmailDraft_leadId_idx" ON "EmailDraft"("leadId");

-- AddForeignKey
ALTER TABLE "EmailDraft" ADD CONSTRAINT "EmailDraft_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

