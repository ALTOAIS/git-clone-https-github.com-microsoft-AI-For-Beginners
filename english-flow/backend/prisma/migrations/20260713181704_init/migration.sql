-- CreateEnum
CREATE TYPE "CefrLevel" AS ENUM ('A1', 'A1_PLUS', 'A2', 'A2_PLUS', 'B1', 'B1_PLUS', 'B2', 'C1');

-- CreateEnum
CREATE TYPE "PhraseSource" AS ENUM ('SEED', 'AI_LESSON', 'MANUAL', 'SPEAKING', 'UPLOADED_DOCUMENT', 'ERROR_CORRECTION', 'DIAGNOSTIC');

-- CreateEnum
CREATE TYPE "UserPhraseStatus" AS ENUM ('NEW', 'LEARNING', 'MASTERED', 'DIFFICULT');

-- CreateEnum
CREATE TYPE "LessonSource" AS ENUM ('SEED', 'AI_GENERATED', 'UPLOADED_DOCUMENT');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('DRAFT', 'READY', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ErrorStatus" AS ENUM ('NEW', 'PRACTICING', 'IMPROVING', 'RESOLVED', 'REPEATED');

-- CreateEnum
CREATE TYPE "ErrorType" AS ENUM ('ARTICLE', 'VERB_TENSE', 'VERB_FORM', 'WORD_ORDER', 'PREPOSITION', 'VOCABULARY', 'COLLOCATION', 'PRONUNCIATION', 'LITERAL_TRANSLATION', 'MISSING_WORD', 'UNNATURAL_PHRASE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'DELETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nativeLanguage" TEXT NOT NULL DEFAULT 'ru',
    "targetLanguage" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Qyzylorda',
    "currentLevel" "CefrLevel" NOT NULL DEFAULT 'A2',
    "dailyGoalMinutes" INTEGER NOT NULL DEFAULT 15,
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredLearningMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selfAssessment" JSONB,
    "reminderTime" TEXT,
    "notificationSettings" JSONB,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastStudyDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vocabulary" "CefrLevel" NOT NULL DEFAULT 'A2',
    "grammar" "CefrLevel" NOT NULL DEFAULT 'A2',
    "speaking" "CefrLevel" NOT NULL DEFAULT 'A1',
    "listening" "CefrLevel" NOT NULL DEFAULT 'A1',
    "reading" "CefrLevel" NOT NULL DEFAULT 'A2',
    "writing" "CefrLevel" NOT NULL DEFAULT 'A2',
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weaknesses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" TEXT,
    "lastAssessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phrase" (
    "id" TEXT NOT NULL,
    "englishText" TEXT NOT NULL,
    "russianTranslation" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'everyday',
    "cefrLevel" "CefrLevel" NOT NULL DEFAULT 'A2',
    "exampleSentence" TEXT,
    "pronunciationHint" TEXT,
    "audioUrl" TEXT,
    "source" "PhraseSource" NOT NULL DEFAULT 'MANUAL',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Phrase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPhrase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phraseId" TEXT NOT NULL,
    "masteryScore" INTEGER NOT NULL DEFAULT 0,
    "confidenceScore" INTEGER NOT NULL DEFAULT 0,
    "reviewStage" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "personalExample" TEXT,
    "status" "UserPhraseStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPhrase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "level" "CefrLevel" NOT NULL DEFAULT 'A2',
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "objective" TEXT,
    "dayNumber" INTEGER,
    "contentJson" JSONB NOT NULL,
    "source" "LessonSource" NOT NULL DEFAULT 'SEED',
    "status" "LessonStatus" NOT NULL DEFAULT 'READY',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "score" INTEGER,
    "speakingSeconds" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "resultJson" JSONB,

    CONSTRAINT "LessonAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "correctedText" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "errorType" "ErrorType" NOT NULL DEFAULT 'OTHER',
    "source" TEXT NOT NULL DEFAULT 'lesson',
    "personalExample" TEXT,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "status" "ErrorStatus" NOT NULL DEFAULT 'NEW',
    "nextPracticeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErrorRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'free',
    "level" "CefrLevel" NOT NULL DEFAULT 'A2',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "transcriptJson" JSONB NOT NULL DEFAULT '[]',
    "feedbackJson" JSONB,
    "speakingSeconds" INTEGER NOT NULL DEFAULT 0,
    "userTurns" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phraseId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "answer" TEXT,
    "correct" BOOLEAN NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 2,
    "responseTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "plannedMinutes" INTEGER NOT NULL DEFAULT 15,
    "tasksJson" JSONB NOT NULL,
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedMaterial" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "extractedText" TEXT,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UploadedMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceBenchmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "audioDataUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SkillProfile_userId_key" ON "SkillProfile"("userId");

-- CreateIndex
CREATE INDEX "Phrase_category_idx" ON "Phrase"("category");

-- CreateIndex
CREATE INDEX "UserPhrase_userId_nextReviewAt_idx" ON "UserPhrase"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserPhrase_userId_phraseId_key" ON "UserPhrase"("userId", "phraseId");

-- CreateIndex
CREATE INDEX "LessonAttempt_userId_startedAt_idx" ON "LessonAttempt"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "ErrorRecord_userId_status_idx" ON "ErrorRecord"("userId", "status");

-- CreateIndex
CREATE INDEX "Conversation_userId_startedAt_idx" ON "Conversation"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "ReviewAttempt_userId_createdAt_idx" ON "ReviewAttempt"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPlan_userId_date_key" ON "DailyPlan"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceBenchmark_userId_month_key" ON "VoiceBenchmark"("userId", "month");

-- AddForeignKey
ALTER TABLE "SkillProfile" ADD CONSTRAINT "SkillProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPhrase" ADD CONSTRAINT "UserPhrase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPhrase" ADD CONSTRAINT "UserPhrase_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES "Phrase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAttempt" ADD CONSTRAINT "LessonAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAttempt" ADD CONSTRAINT "LessonAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorRecord" ADD CONSTRAINT "ErrorRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAttempt" ADD CONSTRAINT "ReviewAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAttempt" ADD CONSTRAINT "ReviewAttempt_phraseId_fkey" FOREIGN KEY ("phraseId") REFERENCES "Phrase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlan" ADD CONSTRAINT "DailyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedMaterial" ADD CONSTRAINT "UploadedMaterial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceBenchmark" ADD CONSTRAINT "VoiceBenchmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
