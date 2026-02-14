-- CreateEnum
CREATE TYPE "CustomListScope" AS ENUM ('LEADS', 'FUNDING_OUTREACH');

-- CreateEnum
CREATE TYPE "CustomListKind" AS ENUM ('SINGLE_SELECT', 'MULTI_SELECT', 'TAGS');

-- CreateTable
CREATE TABLE "CustomListDefinition" (
    "id" TEXT NOT NULL,
    "scope" "CustomListScope" NOT NULL,
    "kind" "CustomListKind" NOT NULL DEFAULT 'SINGLE_SELECT',
    "name" TEXT NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomListDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomListDefinition_scope_idx" ON "CustomListDefinition"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "CustomListDefinition_scope_name_key" ON "CustomListDefinition"("scope", "name");
