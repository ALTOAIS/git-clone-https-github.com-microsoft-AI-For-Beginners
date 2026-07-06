-- CreateTable
CREATE TABLE "ai_interaction_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT,
    "module" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "inputSummary" TEXT NOT NULL,
    "outputSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_interaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_interaction_logs_entityType_entityId_idx" ON "ai_interaction_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "ai_interaction_logs" ADD CONSTRAINT "ai_interaction_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
