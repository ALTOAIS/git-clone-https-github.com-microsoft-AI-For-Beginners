-- AlterEnum
ALTER TYPE "LessonContentType" ADD VALUE 'QUIZ';

-- AlterTable
ALTER TABLE "test_attempts" ALTER COLUMN "stage" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tests" ADD COLUMN     "lessonId" TEXT,
ALTER COLUMN "courseId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tests_lessonId_key" ON "tests"("lessonId");

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "course_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

