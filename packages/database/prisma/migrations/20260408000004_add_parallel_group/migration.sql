-- AlterTable: add parallelGroup to WorkflowStep
ALTER TABLE "WorkflowStep" ADD COLUMN "parallelGroup" TEXT;
