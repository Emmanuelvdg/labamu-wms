-- AlterTable: add retry configuration to WorkflowStep
ALTER TABLE "WorkflowStep" ADD COLUMN "maxRetries" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WorkflowStep" ADD COLUMN "retryBackoffSeconds" INTEGER NOT NULL DEFAULT 30;

-- AlterTable: add retry tracking to WorkflowTaskInstance
ALTER TABLE "WorkflowTaskInstance" ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WorkflowTaskInstance" ADD COLUMN "retryAfter" DATETIME;
