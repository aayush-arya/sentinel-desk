-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TicketHistoryAction" ADD VALUE 'SLA_PAUSED';
ALTER TYPE "TicketHistoryAction" ADD VALUE 'SLA_RESUMED';
ALTER TYPE "TicketHistoryAction" ADD VALUE 'RESPONSE_SLA_BREACHED';
ALTER TYPE "TicketHistoryAction" ADD VALUE 'RESOLUTION_SLA_BREACHED';
ALTER TYPE "TicketHistoryAction" ADD VALUE 'AUTO_ESCALATED';

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "resolutionBreached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolutionDueAt" TIMESTAMP(3),
ADD COLUMN     "responseBreached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "responseDueAt" TIMESTAMP(3),
ADD COLUMN     "slaEscalatedAt" TIMESTAMP(3),
ADD COLUMN     "slaPausedAt" TIMESTAMP(3),
ADD COLUMN     "slaPolicyId" TEXT;

-- CreateTable
CREATE TABLE "business_hours_schedules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_hours_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_hours_slots" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,

    CONSTRAINT "business_hours_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "businessHoursScheduleId" TEXT NOT NULL,
    "autoEscalateAtPercent" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_policy_rules" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL,
    "responseTargetMinutes" INTEGER NOT NULL,
    "resolutionTargetMinutes" INTEGER NOT NULL,

    CONSTRAINT "sla_policy_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_hours_schedules_organizationId_idx" ON "business_hours_schedules"("organizationId");

-- CreateIndex
CREATE INDEX "business_hours_slots_scheduleId_idx" ON "business_hours_slots"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_scheduleId_date_key" ON "holidays"("scheduleId", "date");

-- CreateIndex
CREATE INDEX "sla_policies_organizationId_idx" ON "sla_policies"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "sla_policy_rules_policyId_priority_key" ON "sla_policy_rules"("policyId", "priority");

-- CreateIndex
CREATE INDEX "tickets_responseDueAt_idx" ON "tickets"("responseDueAt");

-- CreateIndex
CREATE INDEX "tickets_resolutionDueAt_idx" ON "tickets"("resolutionDueAt");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "sla_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_hours_schedules" ADD CONSTRAINT "business_hours_schedules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_hours_slots" ADD CONSTRAINT "business_hours_slots_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "business_hours_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "business_hours_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_businessHoursScheduleId_fkey" FOREIGN KEY ("businessHoursScheduleId") REFERENCES "business_hours_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_policy_rules" ADD CONSTRAINT "sla_policy_rules_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "sla_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
