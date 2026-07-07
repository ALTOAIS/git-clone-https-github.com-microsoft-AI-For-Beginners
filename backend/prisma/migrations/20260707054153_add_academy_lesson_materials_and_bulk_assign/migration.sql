-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'COURSE_LESSON';

-- AlterTable
ALTER TABLE "course_assignments" ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "course_lessons" ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "videoUrl" TEXT;
