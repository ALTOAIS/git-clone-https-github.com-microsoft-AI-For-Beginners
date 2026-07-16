-- AlterTable
ALTER TABLE "ErrorRecord" ADD COLUMN     "lastSkippedDate" TEXT,
ADD COLUMN     "skipCount" INTEGER NOT NULL DEFAULT 0;
