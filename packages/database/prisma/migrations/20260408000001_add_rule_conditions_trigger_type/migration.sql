-- AlterTable: add conditions and triggerType to Rule
ALTER TABLE "Rule" ADD COLUMN "conditions" TEXT;
ALTER TABLE "Rule" ADD COLUMN "triggerType" TEXT;
