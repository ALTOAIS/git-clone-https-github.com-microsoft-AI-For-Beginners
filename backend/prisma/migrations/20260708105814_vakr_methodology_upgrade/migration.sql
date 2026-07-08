-- CreateEnum
CREATE TYPE "AnalysisScope" AS ENUM ('LEGAL_ACTS', 'ORG_MANAGEMENT', 'BOTH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CorruptogenicFactorType" ADD VALUE 'LEGAL_GAP';
ALTER TYPE "CorruptogenicFactorType" ADD VALUE 'LEGAL_COLLISION';
ALTER TYPE "CorruptogenicFactorType" ADD VALUE 'LINGUISTIC_UNCERTAINTY';
ALTER TYPE "CorruptogenicFactorType" ADD VALUE 'RIGHT_INSTEAD_OF_DUTY';
ALTER TYPE "CorruptogenicFactorType" ADD VALUE 'EXCESSIVE_REQUIREMENTS';
ALTER TYPE "CorruptogenicFactorType" ADD VALUE 'ADMINISTRATIVE_BARRIERS';
ALTER TYPE "CorruptogenicFactorType" ADD VALUE 'IMPROPER_FUNCTIONS_DEFINITION';
ALTER TYPE "CorruptogenicFactorType" ADD VALUE 'NO_DEADLINES';
ALTER TYPE "CorruptogenicFactorType" ADD VALUE 'NO_DECISION_GROUNDS';
ALTER TYPE "CorruptogenicFactorType" ADD VALUE 'EXTERNAL_INTERACTION';

-- AlterTable
ALTER TABLE "corruption_analyses" ADD COLUMN     "analysisScope" "AnalysisScope",
ADD COLUMN     "coordinatorId" TEXT,
ADD COLUMN     "decisionMakerId" TEXT,
ADD COLUMN     "extensionRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orderBasis" TEXT,
ADD COLUMN     "orderDate" TIMESTAMP(3),
ADD COLUMN     "orderNumber" TEXT;

-- AlterTable
ALTER TABLE "risks" ADD COLUMN     "originContext" JSONB,
ADD COLUMN     "sourceAnalysisId" TEXT;

-- CreateTable
CREATE TABLE "analysis_checklist_answers" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "status" TEXT,
    "comment" TEXT,
    "responsibleDepartmentId" TEXT,
    "dueDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN,
    "isReliable" BOOLEAN,
    "linkedDocumentId" TEXT,
    "linkedFactorId" TEXT,
    "linkedRiskId" TEXT,
    "linkedRecommendationId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "analysis_checklist_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_exposed_positions" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "positionTitle" TEXT NOT NULL,
    "departmentId" TEXT,
    "authorities" TEXT,
    "linkedRiskId" TEXT,
    "riskLevel" TEXT,
    "recommendedControls" TEXT,
    "trainingNeeded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_exposed_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analysis_checklist_answers_analysisId_questionKey_key" ON "analysis_checklist_answers"("analysisId", "questionKey");

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_sourceAnalysisId_fkey" FOREIGN KEY ("sourceAnalysisId") REFERENCES "corruption_analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corruption_analyses" ADD CONSTRAINT "corruption_analyses_decisionMakerId_fkey" FOREIGN KEY ("decisionMakerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corruption_analyses" ADD CONSTRAINT "corruption_analyses_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_checklist_answers" ADD CONSTRAINT "analysis_checklist_answers_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "corruption_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_checklist_answers" ADD CONSTRAINT "analysis_checklist_answers_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_checklist_answers" ADD CONSTRAINT "analysis_checklist_answers_linkedDocumentId_fkey" FOREIGN KEY ("linkedDocumentId") REFERENCES "analysis_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_checklist_answers" ADD CONSTRAINT "analysis_checklist_answers_linkedFactorId_fkey" FOREIGN KEY ("linkedFactorId") REFERENCES "analysis_factors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_checklist_answers" ADD CONSTRAINT "analysis_checklist_answers_linkedRiskId_fkey" FOREIGN KEY ("linkedRiskId") REFERENCES "analysis_risks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_checklist_answers" ADD CONSTRAINT "analysis_checklist_answers_linkedRecommendationId_fkey" FOREIGN KEY ("linkedRecommendationId") REFERENCES "analysis_recommendations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_checklist_answers" ADD CONSTRAINT "analysis_checklist_answers_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_exposed_positions" ADD CONSTRAINT "analysis_exposed_positions_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "corruption_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_exposed_positions" ADD CONSTRAINT "analysis_exposed_positions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_exposed_positions" ADD CONSTRAINT "analysis_exposed_positions_linkedRiskId_fkey" FOREIGN KEY ("linkedRiskId") REFERENCES "analysis_risks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
