-- CreateTable
CREATE TABLE "VoiceAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "targetEnglish" TEXT,
    "transcript" TEXT NOT NULL,
    "corrected" TEXT,
    "feedbackJson" JSONB,
    "verdict" TEXT,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "errorRecordIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "repeatedAfterCorrection" BOOLEAN NOT NULL DEFAULT false,
    "secondImproved" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceAnswer_userId_createdAt_idx" ON "VoiceAnswer"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "VoiceAnswer" ADD CONSTRAINT "VoiceAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
