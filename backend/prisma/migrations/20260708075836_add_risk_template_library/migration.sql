-- CreateEnum
CREATE TYPE "RiskTemplateDirection" AS ENUM ('PROCUREMENT', 'CONTRACT_MANAGEMENT', 'CONFLICT_OF_INTEREST', 'GIFTS_HOSPITALITY', 'HR_PERSONNEL', 'FINANCE_PAYMENTS', 'ACCOUNTING', 'CHARITY_SPONSORSHIP', 'GOVERNMENT_INTERACTION', 'THIRD_PARTY_DUE_DILIGENCE', 'AFFILIATION_RELATED_PARTIES', 'ASSET_MANAGEMENT', 'CONSTRUCTION_CAPITAL_PROJECTS', 'IT_DATA_ACCESS', 'INSIDER_INFORMATION', 'SANCTIONS', 'AML', 'FRAUD_THEFT', 'CORPORATE_GOVERNANCE', 'TRAINING_COMPLIANCE_CULTURE');

-- AlterTable
ALTER TABLE "analysis_risks" ADD COLUMN     "sourceTemplateId" TEXT;

-- AlterTable
ALTER TABLE "risks" ADD COLUMN     "sourceTemplateId" TEXT;

-- CreateTable
CREATE TABLE "risk_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "categoryId" TEXT,
    "direction" "RiskTemplateDirection" NOT NULL,
    "description" TEXT NOT NULL,
    "corruptionScheme" TEXT,
    "causes" TEXT,
    "corruptionFactors" TEXT,
    "consequences" TEXT,
    "redFlags" TEXT,
    "typicalControls" TEXT[],
    "recommendedActions" TEXT[],
    "baseProbability" INTEGER NOT NULL,
    "baseImpact" INTEGER NOT NULL,
    "baseScore" INTEGER NOT NULL,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "risk_templates_code_key" ON "risk_templates"("code");

-- AddForeignKey
ALTER TABLE "risk_templates" ADD CONSTRAINT "risk_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "risk_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_risks" ADD CONSTRAINT "analysis_risks_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "risk_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
