import axios from "axios";

const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;
const APP_URL           = process.env.NEXT_PUBLIC_APP_URL;

// ─── Core send function ───────────────────────────────────
const sendTeamsCard = async (card: object): Promise<void> => {
  if (!TEAMS_WEBHOOK_URL) {
    console.log("⚠️  TEAMS_WEBHOOK_URL not set — skipping Teams notification");
    return;
  }
  try {
    await axios.post(TEAMS_WEBHOOK_URL, card, {
      headers: { "Content-Type": "application/json" },
    });
    console.log("✅ Teams notification sent");
  } catch (err) {
    console.error("❌ Teams notification failed:", err);
  }
};

// ─── 1. Goal Sheet Submitted → Manager ───────────────────
export const sendGoalSubmittedTeamsCard = async (opts: {
  managerName:  string;
  employeeName: string;
  cycleName:    string;
  goalCount:    number;
  totalWeight:  number;
  sheetId:      string;
}) => {
  const deepLink = `${APP_URL}/manager/approvals/${opts.sheetId}`;

  const card = {
    "@type":      "MessageCard",
    "@context":   "http://schema.org/extensions",
    "themeColor": "4f46e5",
    "summary":    `${opts.employeeName} submitted goal sheet`,
    "sections": [{
      "activityTitle":    `📋 New Goal Sheet — ${opts.employeeName}`,
      "activitySubtitle": `Submitted for your review · ${opts.cycleName}`,
      "activityImage":    `${APP_URL}/icon.png`,
      "facts": [
        { "name": "Employee",   "value": opts.employeeName },
        { "name": "Cycle",      "value": opts.cycleName    },
        { "name": "Goals",      "value": `${opts.goalCount} goals` },
        { "name": "Weightage",  "value": `${opts.totalWeight}% total` },
        { "name": "Status",     "value": "⏳ Awaiting your approval" },
      ],
      "markdown": true,
    }],
    "potentialAction": [{
      "@type": "OpenUri",
      "name":  "Review Goal Sheet →",
      "targets": [{ "os": "default", "uri": deepLink }],
    }],
  };

  await sendTeamsCard(card);
};

// ─── 2. Goal Approved → Channel ──────────────────────────
export const sendGoalApprovedTeamsCard = async (opts: {
  employeeName: string;
  managerName:  string;
  cycleName:    string;
}) => {
  const card = {
    "@type":      "MessageCard",
    "@context":   "http://schema.org/extensions",
    "themeColor": "10b981",
    "summary":    `${opts.employeeName}'s goals approved`,
    "sections": [{
      "activityTitle":    `✅ Goals Approved — ${opts.employeeName}`,
      "activitySubtitle": `${opts.cycleName}`,
      "facts": [
        { "name": "Approved By", "value": opts.managerName   },
        { "name": "Status",      "value": "✅ Locked & Active" },
      ],
      "markdown": true,
    }],
  };

  await sendTeamsCard(card);
};

// ─── 3. Check-in Reminder → Channel ──────────────────────
export const sendCheckinReminderTeamsCard = async (opts: {
  quarter:      string;
  daysLeft:     number;
  pendingCount: number;
}) => {
  const deepLink = `${APP_URL}/employee/checkin`;

  const card = {
    "@type":      "MessageCard",
    "@context":   "http://schema.org/extensions",
    "themeColor": "f59e0b",
    "summary":    `${opts.quarter} Check-in Reminder`,
    "sections": [{
      "activityTitle":    `⏰ ${opts.quarter} Check-in Closing Soon`,
      "activitySubtitle": `${opts.daysLeft} days remaining`,
      "facts": [
        { "name": "Quarter",    "value": opts.quarter             },
        { "name": "Days Left",  "value": `${opts.daysLeft} days`  },
        { "name": "Pending",    "value": `${opts.pendingCount} employees haven't submitted` },
      ],
      "markdown": true,
    }],
    "potentialAction": [{
      "@type": "OpenUri",
      "name":  "Submit Check-in →",
      "targets": [{ "os": "default", "uri": deepLink }],
    }],
  };

  await sendTeamsCard(card);
};

// ─── 4. Shared Goal Pushed → Channel ─────────────────────
export const sendSharedGoalPushedTeamsCard = async (opts: {
  managerName:    string;
  goalTitle:      string;
  employeeCount:  number;
}) => {
  const card = {
    "@type":      "MessageCard",
    "@context":   "http://schema.org/extensions",
    "themeColor": "6366f1",
    "summary":    "Shared Goal Deployed",
    "sections": [{
      "activityTitle":    `🔗 Shared Goal Deployed`,
      "activitySubtitle": `by ${opts.managerName}`,
      "facts": [
        { "name": "Goal",      "value": opts.goalTitle               },
        { "name": "Pushed To", "value": `${opts.employeeCount} team members` },
      ],
      "markdown": true,
    }],
  };

  await sendTeamsCard(card);
};
