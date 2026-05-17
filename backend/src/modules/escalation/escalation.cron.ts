import cron                       from "node-cron";
import { runEscalationChecker }   from "./escalation.service";

// Runs every day at 9:00 AM
export const startEscalationCron = () => {
  console.log("⏰ Escalation cron scheduled — daily at 9:00 AM");

  cron.schedule("0 9 * * *", async () => {
    console.log("🔄 Cron triggered:", new Date().toISOString());
    await runEscalationChecker();
  }, {
    timezone: "Asia/Kolkata",
  });
};

// Manual trigger for testing
export const triggerEscalationNow = async () => {
  console.log("🔄 Manual escalation trigger");
  await runEscalationChecker();
};
