-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('ORGANIZATIONAL', 'REGULATORY', 'HR', 'DIGITALIZATION', 'AUTOMATION', 'STRONGER_CONTROLS', 'SEPARATION_OF_DUTIES', 'PROCESS_CHANGE', 'TRAINING', 'MONITORING');

-- CreateEnum
CREATE TYPE "ActionPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "analysis_recommendations" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "riskId" TEXT,
    "type" "RecommendationType" NOT NULL,
    "description" TEXT NOT NULL,
    "responsibleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_action_items" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "recommendationId" TEXT,
    "task" TEXT NOT NULL,
    "expectedResult" TEXT,
    "responsibleId" TEXT,
    "departmentId" TEXT,
    "deadline" TIMESTAMP(3),
    "priority" "ActionPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ActionStatus" NOT NULL DEFAULT 'PLANNED',
    "supportingDocs" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_action_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "analysis_recommendations" ADD CONSTRAINT "analysis_recommendations_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "corruption_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_recommendations" ADD CONSTRAINT "analysis_recommendations_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "analysis_risks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_recommendations" ADD CONSTRAINT "analysis_recommendations_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_action_items" ADD CONSTRAINT "analysis_action_items_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "corruption_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_action_items" ADD CONSTRAINT "analysis_action_items_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "analysis_recommendations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_action_items" ADD CONSTRAINT "analysis_action_items_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_action_items" ADD CONSTRAINT "analysis_action_items_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
