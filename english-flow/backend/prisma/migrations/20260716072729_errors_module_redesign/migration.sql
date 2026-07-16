-- CreateEnum
CREATE TYPE "ErrorPracticeStatus" AS ENUM ('NEW', 'PRACTICING', 'COMPLETED_TODAY', 'SCHEDULED_REVIEW', 'RECURRING', 'MASTERED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DetectedLanguage" AS ENUM ('EN', 'RU', 'MIXED', 'EMPTY', 'UNCLEAR');

-- AlterTable
ALTER TABLE "ErrorRecord" ADD COLUMN     "completedTodayDate" TEXT,
ADD COLUMN     "contextsPassed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "detectedLanguage" "DetectedLanguage",
ADD COLUMN     "lastPracticedAt" TIMESTAMP(3),
ADD COLUMN     "originalUserAnswer" TEXT,
ADD COLUMN     "practiceStatus" "ErrorPracticeStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "sourceContext" TEXT,
ADD COLUMN     "sourceEntityId" TEXT,
ADD COLUMN     "sourceModule" TEXT,
ADD COLUMN     "sourcePrompt" TEXT,
ADD COLUMN     "successfulReviewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ErrorRecord_userId_practiceStatus_idx" ON "ErrorRecord"("userId", "practiceStatus");
