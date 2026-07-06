-- AlterTable
ALTER TABLE "analysis_action_items" ADD COLUMN     "linkedActionId" TEXT;

-- AlterTable
ALTER TABLE "analysis_risks" ADD COLUMN     "linkedRiskId" TEXT;

-- AlterTable
ALTER TABLE "corruption_analyses" ADD COLUMN     "reassessedAt" TIMESTAMP(3),
ADD COLUMN     "reassessmentNotes" TEXT;

-- CreateTable
CREATE TABLE "analysis_comments" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "authorId" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analysis_action_items_linkedActionId_key" ON "analysis_action_items"("linkedActionId");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_risks_linkedRiskId_key" ON "analysis_risks"("linkedRiskId");

-- AddForeignKey
ALTER TABLE "analysis_risks" ADD CONSTRAINT "analysis_risks_linkedRiskId_fkey" FOREIGN KEY ("linkedRiskId") REFERENCES "risks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_action_items" ADD CONSTRAINT "analysis_action_items_linkedActionId_fkey" FOREIGN KEY ("linkedActionId") REFERENCES "actions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_comments" ADD CONSTRAINT "analysis_comments_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "corruption_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_comments" ADD CONSTRAINT "analysis_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

