-- CreateEnum
CREATE TYPE "AnalysisStage" AS ENUM ('CREATION', 'PLANNING', 'WORKING_GROUP', 'DOCUMENTS', 'PROCESS_MAP', 'FACTORS', 'RISKS', 'ASSESSMENT', 'RECOMMENDATIONS', 'ACTION_PLAN', 'COORDINATION', 'APPROVAL', 'MONITORING', 'REASSESSMENT');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'OVERDUE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AnalysisDocumentCategory" AS ENUM ('LAW', 'INTERNAL_DOCUMENT', 'REGULATION', 'PROCEDURE', 'POLICY', 'INSTRUCTION', 'ORG_STRUCTURE', 'JOB_DESCRIPTION', 'PROCESS_MAP', 'PREVIOUS_ANALYSIS', 'INSPECTION_MATERIALS', 'APPEAL', 'COURT_PRACTICE', 'OTHER');

-- CreateTable
CREATE TABLE "corruption_analyses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT,
    "subject" TEXT,
    "legalBasis" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "leadId" TEXT,
    "stage" "AnalysisStage" NOT NULL DEFAULT 'CREATION',
    "status" "AnalysisStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corruption_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_departments" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "analysis_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_plan_items" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "direction" TEXT,
    "departmentId" TEXT,
    "ownerId" TEXT,
    "deadline" TIMESTAMP(3),
    "checkpoint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_working_group_members" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "functions" TEXT,
    "responsibilityArea" TEXT,
    "tasks" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_working_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_documents" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "category" "AnalysisDocumentCategory" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "corruption_analyses_code_key" ON "corruption_analyses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_departments_analysisId_departmentId_key" ON "analysis_departments"("analysisId", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_working_group_members_analysisId_userId_key" ON "analysis_working_group_members"("analysisId", "userId");

-- AddForeignKey
ALTER TABLE "corruption_analyses" ADD CONSTRAINT "corruption_analyses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corruption_analyses" ADD CONSTRAINT "corruption_analyses_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corruption_analyses" ADD CONSTRAINT "corruption_analyses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_departments" ADD CONSTRAINT "analysis_departments_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "corruption_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_departments" ADD CONSTRAINT "analysis_departments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_plan_items" ADD CONSTRAINT "analysis_plan_items_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "corruption_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_plan_items" ADD CONSTRAINT "analysis_plan_items_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_plan_items" ADD CONSTRAINT "analysis_plan_items_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_working_group_members" ADD CONSTRAINT "analysis_working_group_members_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "corruption_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_working_group_members" ADD CONSTRAINT "analysis_working_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_documents" ADD CONSTRAINT "analysis_documents_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "corruption_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_documents" ADD CONSTRAINT "analysis_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
