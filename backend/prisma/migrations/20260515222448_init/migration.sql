-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "GoalSheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED');

-- CreateEnum
CREATE TYPE "UomType" AS ENUM ('NUMERIC', 'PERCENTAGE', 'TIMELINE', 'ZERO_BASED');

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "manager_id" TEXT,
    "department_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalCycle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GoalCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThrustArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "ThrustArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalSheet" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "status" "GoalSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "rework_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "goal_sheet_id" TEXT NOT NULL,
    "thrust_area_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "uom_type" "UomType" NOT NULL,
    "target_value" TEXT NOT NULL,
    "weightage" DOUBLE PRECISION NOT NULL,
    "achievement" TEXT,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "shared_from_goal_id" TEXT,
    "is_readonly_title" BOOLEAN NOT NULL DEFAULT false,
    "is_readonly_target" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_manager_id_idx" ON "User"("manager_id");

-- CreateIndex
CREATE INDEX "User_department_id_idx" ON "User"("department_id");

-- CreateIndex
CREATE INDEX "GoalSheet_employee_id_idx" ON "GoalSheet"("employee_id");

-- CreateIndex
CREATE INDEX "GoalSheet_cycle_id_idx" ON "GoalSheet"("cycle_id");

-- CreateIndex
CREATE INDEX "GoalSheet_status_idx" ON "GoalSheet"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GoalSheet_employee_id_cycle_id_key" ON "GoalSheet"("employee_id", "cycle_id");

-- CreateIndex
CREATE INDEX "Goal_goal_sheet_id_idx" ON "Goal"("goal_sheet_id");

-- CreateIndex
CREATE INDEX "Goal_thrust_area_id_idx" ON "Goal"("thrust_area_id");

-- CreateIndex
CREATE INDEX "Goal_shared_from_goal_id_idx" ON "Goal"("shared_from_goal_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalSheet" ADD CONSTRAINT "GoalSheet_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalSheet" ADD CONSTRAINT "GoalSheet_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "GoalCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_goal_sheet_id_fkey" FOREIGN KEY ("goal_sheet_id") REFERENCES "GoalSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_thrust_area_id_fkey" FOREIGN KEY ("thrust_area_id") REFERENCES "ThrustArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_shared_from_goal_id_fkey" FOREIGN KEY ("shared_from_goal_id") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
