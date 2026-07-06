-- AlterTable
ALTER TABLE "course_lessons" ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "applicableRoles" "Role"[] DEFAULT ARRAY[]::"Role"[];
