-- CreateEnum
CREATE TYPE "ProcessControlPointType" AS ENUM ('DECISION_MAKING', 'DISCRETIONARY_POWERS', 'EXTERNAL_CONTACTS', 'FINANCIAL_OPERATIONS', 'HR_DECISIONS', 'PROCUREMENT', 'DIGITAL_SYSTEMS', 'CONTROL_MEASURES');

-- CreateEnum
CREATE TYPE "CorruptogenicFactorType" AS ENUM ('DISCRETION', 'CONFLICT_OF_INTEREST', 'LACK_OF_CONTROL', 'OPACITY', 'EXCEPTIONS', 'MANUAL_OPERATIONS', 'INFORMATION_ACCESS', 'SUPPLIER_CONTACTS', 'HR_DECISIONS', 'FINANCIAL_OPERATIONS', 'PROCUREMENT', 'PERMITS', 'PROPERTY_USE');

-- CreateTable
CREATE TABLE "analysis_process_steps" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT,
    "executorId" TEXT,
    "legalBasis" TEXT,
    "inputDescription" TEXT,
    "outputDescription" TEXT,
    "controlPoints" "ProcessControlPointType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_process_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_factors" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "processStepId" TEXT,
    "factorType" "CorruptogenicFactorType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_risks" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "factorId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "source" TEXT,
    "cause" TEXT,
    "conditions" TEXT,
    "corruptionScheme" TEXT,
    "interestedParties" TEXT,
    "consequences" TEXT,
    "existingControls" TEXT,
    "ownerId" TEXT,
    "likelihood" INTEGER,
    "impact" INTEGER,
    "score" INTEGER,
    "controlEffectiveness" "ControlEffectiveness" NOT NULL DEFAULT 'NOT_TESTED',
    "residualLikelihood" INTEGER,
    "residualImpact" INTEGER,
    "residualScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_risks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "analysis_process_steps" ADD CONSTRAINT "analysis_process_steps_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "corruption_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_process_steps" ADD CONSTRAINT "analysis_process_steps_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_process_steps" ADD CONSTRAINT "analysis_process_steps_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_factors" ADD CONSTRAINT "analysis_factors_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "corruption_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_factors" ADD CONSTRAINT "analysis_factors_processStepId_fkey" FOREIGN KEY ("processStepId") REFERENCES "analysis_process_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_risks" ADD CONSTRAINT "analysis_risks_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "corruption_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_risks" ADD CONSTRAINT "analysis_risks_factorId_fkey" FOREIGN KEY ("factorId") REFERENCES "analysis_factors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_risks" ADD CONSTRAINT "analysis_risks_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_risks" ADD CONSTRAINT "analysis_risks_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
