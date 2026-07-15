-- CreateEnum
CREATE TYPE "MicroCategory" AS ENUM ('ARTICLES', 'THIRD_PERSON_SINGULAR', 'PRESENT_SIMPLE', 'PRESENT_PERFECT', 'PAST_SIMPLE', 'PREPOSITIONS', 'WORD_ORDER', 'COMPLY_VS_COMPLIANCE', 'MAKE_VS_DO', 'COUNTABLE_VS_UNCOUNTABLE', 'COLLOCATIONS', 'COMPLIANCE_VOCABULARY');

-- CreateEnum
CREATE TYPE "MicroLessonStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED');

-- AlterTable
ALTER TABLE "ErrorRecord" ADD COLUMN     "lastOccurrenceAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "microCategory" "MicroCategory";

-- CreateTable
CREATE TABLE "MicroLesson" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "MicroCategory" NOT NULL,
    "status" "MicroLessonStatus" NOT NULL DEFAULT 'PENDING',
    "contentJson" JSONB NOT NULL,
    "sourceErrorIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resultJson" JSONB,
    "aiMode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MicroLesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MicroLesson_userId_category_idx" ON "MicroLesson"("userId", "category");

-- CreateIndex
CREATE INDEX "MicroLesson_userId_status_idx" ON "MicroLesson"("userId", "status");

-- CreateIndex
CREATE INDEX "ErrorRecord_userId_microCategory_idx" ON "ErrorRecord"("userId", "microCategory");

-- AddForeignKey
ALTER TABLE "MicroLesson" ADD CONSTRAINT "MicroLesson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
