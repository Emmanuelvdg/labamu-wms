-- AlterTable: add slaDurationMinutes to WorkflowStep
ALTER TABLE "WorkflowStep" ADD COLUMN "slaDurationMinutes" INTEGER;

-- AlterTable: add dueAt to WorkflowTaskInstance
ALTER TABLE "WorkflowTaskInstance" ADD COLUMN "dueAt" DATETIME;
