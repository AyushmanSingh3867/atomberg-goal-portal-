-- CreateEnum
CREATE TYPE "GoalProgress" AS ENUM ('NOT_STARTED', 'ON_TRACK', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CheckInPeriod" AS ENUM ('Q1', 'Q2', 'Q3', 'Q4_ANNUAL');

-- CreateEnum
CREATE TYPE "UomDirection" AS ENUM ('MIN', 'MAX');

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "uom_direction" "UomDirection" NOT NULL DEFAULT 'MIN';

-- CreateTable
CREATE TABLE "CheckInWindow" (
    "id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "period" "CheckInPeriod" NOT NULL,
    "opens_at" TIMESTAMP(3) NOT NULL,
    "closes_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CheckInWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "window_id" TEXT NOT NULL,
    "actual_value" TEXT NOT NULL,
    "status" "GoalProgress" NOT NULL DEFAULT 'NOT_STARTED',
    "progress_score" DOUBLE PRECISION,
    "employee_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInComment" (
    "id" TEXT NOT NULL,
    "goal_sheet_id" TEXT NOT NULL,
    "window_id" TEXT NOT NULL,
    "manager_id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckInWindow_cycle_id_idx" ON "CheckInWindow"("cycle_id");

-- CreateIndex
CREATE INDEX "CheckInWindow_is_active_idx" ON "CheckInWindow"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInWindow_cycle_id_period_key" ON "CheckInWindow"("cycle_id", "period");

-- CreateIndex
CREATE INDEX "Achievement_goal_id_idx" ON "Achievement"("goal_id");

-- CreateIndex
CREATE INDEX "Achievement_window_id_idx" ON "Achievement"("window_id");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_goal_id_window_id_key" ON "Achievement"("goal_id", "window_id");

-- CreateIndex
CREATE INDEX "CheckInComment_goal_sheet_id_idx" ON "CheckInComment"("goal_sheet_id");

-- CreateIndex
CREATE INDEX "CheckInComment_window_id_idx" ON "CheckInComment"("window_id");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInComment_goal_sheet_id_window_id_key" ON "CheckInComment"("goal_sheet_id", "window_id");

-- AddForeignKey
ALTER TABLE "CheckInWindow" ADD CONSTRAINT "CheckInWindow_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "GoalCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_window_id_fkey" FOREIGN KEY ("window_id") REFERENCES "CheckInWindow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInComment" ADD CONSTRAINT "CheckInComment_goal_sheet_id_fkey" FOREIGN KEY ("goal_sheet_id") REFERENCES "GoalSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInComment" ADD CONSTRAINT "CheckInComment_window_id_fkey" FOREIGN KEY ("window_id") REFERENCES "CheckInWindow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInComment" ADD CONSTRAINT "CheckInComment_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
