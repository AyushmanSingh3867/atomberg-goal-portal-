-- CreateTable
CREATE TABLE "EscalationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "days_threshold" INTEGER NOT NULL,
    "notify_level" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationLog" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "notified_to" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "days_passed" INTEGER NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscalationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EscalationRule_is_active_idx" ON "EscalationRule"("is_active");

-- CreateIndex
CREATE INDEX "EscalationRule_trigger_type_idx" ON "EscalationRule"("trigger_type");

-- CreateIndex
CREATE INDEX "EscalationLog_employee_id_idx" ON "EscalationLog"("employee_id");

-- CreateIndex
CREATE INDEX "EscalationLog_resolved_idx" ON "EscalationLog"("resolved");

-- CreateIndex
CREATE INDEX "EscalationLog_created_at_idx" ON "EscalationLog"("created_at");

-- AddForeignKey
ALTER TABLE "EscalationLog" ADD CONSTRAINT "EscalationLog_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "EscalationRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationLog" ADD CONSTRAINT "EscalationLog_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
