-- CreateEnum
CREATE TYPE "GrammarContentStatus" AS ENUM ('DRAFT', 'REVIEWED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SourceVerificationStatus" AS ENUM ('NOT_VERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED_DIRECTLY', 'VERIFIED_BY_ALTERNATIVE_AUTHORITATIVE_SOURCE');

-- CreateEnum
CREATE TYPE "GrammarExampleType" AS ENUM ('CORRECT', 'INCORRECT', 'CONTRAST', 'CONTEXT', 'EXCEPTION');

-- AlterTable
ALTER TABLE "ErrorRecord" ADD COLUMN     "grammarResolverVersion" TEXT,
ADD COLUMN     "grammarRuleId" TEXT;

-- CreateTable
CREATE TABLE "GrammarRule" (
    "id" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "titleEn" TEXT,
    "shortExplanationRu" TEXT NOT NULL,
    "explanationRu" TEXT NOT NULL,
    "formula" TEXT,
    "cefrLevel" "CefrLevel" NOT NULL,
    "contentStatus" "GrammarContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceVerificationStatus" "SourceVerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "exerciseSchemaVersion" TEXT NOT NULL,
    "exerciseTemplates" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarRuleExample" (
    "id" TEXT NOT NULL,
    "grammarRuleId" TEXT NOT NULL,
    "exampleType" "GrammarExampleType" NOT NULL,
    "sentence" TEXT NOT NULL,
    "correction" TEXT,
    "explanation" TEXT,
    "context" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarRuleExample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrammarRule_ruleCode_key" ON "GrammarRule"("ruleCode");

-- CreateIndex
CREATE INDEX "GrammarRule_contentStatus_idx" ON "GrammarRule"("contentStatus");

-- CreateIndex
CREATE INDEX "GrammarRuleExample_grammarRuleId_sortOrder_idx" ON "GrammarRuleExample"("grammarRuleId", "sortOrder");

-- CreateIndex
CREATE INDEX "ErrorRecord_grammarRuleId_idx" ON "ErrorRecord"("grammarRuleId");

-- AddForeignKey
ALTER TABLE "ErrorRecord" ADD CONSTRAINT "ErrorRecord_grammarRuleId_fkey" FOREIGN KEY ("grammarRuleId") REFERENCES "GrammarRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarRuleExample" ADD CONSTRAINT "GrammarRuleExample_grammarRuleId_fkey" FOREIGN KEY ("grammarRuleId") REFERENCES "GrammarRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
