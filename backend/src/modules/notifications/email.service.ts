import nodemailer from "nodemailer";
import { format } from "date-fns";

// ─── SMTP Config ──────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST    || "smtp.gmail.com",
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Base Template ────────────────────────────────────────
const baseTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
        Atomberg
      </div>
      <div style="font-size:13px;color:#c4b5fd;margin-top:4px;font-weight:500;">
        Performance Management Portal
      </div>
    </div>

    <!-- Body -->
    <div style="background:#16162a;border:1px solid #2a2a45;border-top:none;border-radius:0 0 16px 16px;padding:36px;">
      <h2 style="color:#e2e8f0;font-size:22px;font-weight:700;margin:0 0 8px;">
        ${title}
      </h2>
      ${content}
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #2a2a45;font-size:12px;color:#475569;text-align:center;">
        This is an automated notification from Atomberg Goal Portal.<br/>
        Please do not reply to this email.
      </div>
    </div>

  </div>
</body>
</html>
`;

// ─── Core Send Function ───────────────────────────────────
export const sendEmail = async (
  to:      string,
  subject: string,
  html:    string
): Promise<void> => {
  try {
    await transporter.sendMail({
      from:    `"Atomberg Portal" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to} — ${subject}`);
  } catch (err) {
    // Non-blocking — log but don't throw
    console.error(`❌ Email failed to ${to}:`, err);
  }
};

// ─── Helper: CTA Button ───────────────────────────────────
const ctaButton = (label: string, url: string, color = "#4f46e5") => `
  <div style="text-align:center;margin:28px 0;">
    <a href="${url}"
       style="background:${color};color:#fff;padding:14px 32px;border-radius:10px;
              font-weight:700;font-size:14px;text-decoration:none;display:inline-block;
              letter-spacing:0.3px;">
      ${label} →
    </a>
  </div>
`;

// ─── Helper: Info Row ─────────────────────────────────────
const infoRow = (label: string, value: string) => `
  <div style="display:flex;justify-content:space-between;padding:10px 0;
              border-bottom:1px solid #2a2a45;">
    <span style="color:#64748b;font-size:13px;">${label}</span>
    <span style="color:#e2e8f0;font-size:13px;font-weight:600;">${value}</span>
  </div>
`;

// ─────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────

// 1. Goal Sheet Submitted → Manager
export const sendGoalSubmittedEmail = async (opts: {
  managerEmail: string;
  managerName:  string;
  employeeName: string;
  cycleName:    string;
  goalCount:    number;
  sheetId:      string;
}) => {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/manager/approvals/${opts.sheetId}`;
  const html = baseTemplate(`
    <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Hi <strong style="color:#e2e8f0;">${opts.managerName}</strong>, a new goal sheet
      has been submitted and is awaiting your review.
    </p>
    <div style="background:#0f0f1a;border-radius:10px;padding:20px;margin-bottom:8px;">
      ${infoRow("Employee",    opts.employeeName)}
      ${infoRow("Cycle",       opts.cycleName)}
      ${infoRow("Goals",       `${opts.goalCount} goals submitted`)}
      ${infoRow("Submitted At", format(new Date(), "dd MMM yyyy, hh:mm a"))}
    </div>
    ${ctaButton("Review Goal Sheet", url)}
    <p style="color:#475569;font-size:13px;text-align:center;margin:0;">
      Please review and approve or return within 3 business days.
    </p>
  `, "New Goal Sheet Submitted");

  await sendEmail(
    opts.managerEmail,
    `📋 ${opts.employeeName} submitted their goal sheet`,
    html
  );
};

// 2. Goal Sheet Approved → Employee
export const sendGoalApprovedEmail = async (opts: {
  employeeEmail: string;
  employeeName:  string;
  managerName:   string;
  cycleName:     string;
  sheetId:       string;
}) => {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/employee/goals`;
  const html = baseTemplate(`
    <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Great news, <strong style="color:#e2e8f0;">${opts.employeeName}</strong>! 🎉<br/>
      Your goal sheet has been reviewed and approved by your manager.
      Your goals are now <strong style="color:#10b981;">locked</strong> for the cycle.
    </p>
    <div style="background:#0f0f1a;border-radius:10px;padding:20px;margin-bottom:8px;">
      ${infoRow("Approved By",  opts.managerName)}
      ${infoRow("Cycle",        opts.cycleName)}
      ${infoRow("Approved On",  format(new Date(), "dd MMM yyyy"))}
      ${infoRow("Status",       "✅ Approved & Locked")}
    </div>
    <div style="background:#10b981/10;border:1px solid #10b981/30;border-radius:10px;
                padding:16px;margin:20px 0;text-align:center;">
      <p style="color:#10b981;font-weight:600;font-size:14px;margin:0;">
        Your goals are now active. Check-ins will open quarterly.
      </p>
    </div>
    ${ctaButton("View My Goals", url, "#10b981")}
  `, "Your Goal Sheet is Approved ✅");

  await sendEmail(
    opts.employeeEmail,
    `✅ Your goal sheet has been approved — ${opts.cycleName}`,
    html
  );
};

// 3. Goal Sheet Returned → Employee
export const sendGoalReturnedEmail = async (opts: {
  employeeEmail:  string;
  employeeName:   string;
  managerName:    string;
  cycleName:      string;
  reworkComment:  string;
  sheetId:        string;
}) => {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/employee/goals`;
  const html = baseTemplate(`
    <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Hi <strong style="color:#e2e8f0;">${opts.employeeName}</strong>,<br/>
      Your goal sheet has been returned by your manager for revision.
      Please review the feedback and resubmit.
    </p>
    <div style="background:#0f0f1a;border-radius:10px;padding:20px;margin-bottom:16px;">
      ${infoRow("Returned By", opts.managerName)}
      ${infoRow("Cycle",       opts.cycleName)}
      ${infoRow("Returned On", format(new Date(), "dd MMM yyyy"))}
    </div>
    <div style="background:#451a03;border:1px solid #92400e;border-radius:10px;padding:20px;margin:0 0 8px;">
      <p style="color:#fbbf24;font-size:12px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">
        Manager's Feedback
      </p>
      <p style="color:#fde68a;font-size:14px;line-height:1.6;margin:0;">
        "${opts.reworkComment}"
      </p>
    </div>
    ${ctaButton("Revise My Goals", url, "#d97706")}
    <p style="color:#475569;font-size:13px;text-align:center;margin:0;">
      Please make the necessary changes and resubmit as soon as possible.
    </p>
  `, "Goal Sheet Returned for Revision");

  await sendEmail(
    opts.employeeEmail,
    `⚠️ Your goal sheet needs revision — ${opts.cycleName}`,
    html
  );
};

// 4. Check-in Reminder → Employee
export const sendCheckinReminderEmail = async (opts: {
  employeeEmail: string;
  employeeName:  string;
  quarter:       string;
  windowCloses:  Date;
  daysLeft:      number;
}) => {
  const url  = `${process.env.NEXT_PUBLIC_APP_URL}/employee/checkin`;
  const html = baseTemplate(`
    <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Hi <strong style="color:#e2e8f0;">${opts.employeeName}</strong>,<br/>
      This is a reminder that the <strong style="color:#818cf8;">
      ${opts.quarter} Check-in window</strong> is closing soon.
      Please log your achievements before the deadline.
    </p>
    <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:12px;
                padding:24px;text-align:center;margin:0 0 24px;">
      <p style="color:#818cf8;font-size:13px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">
        Window Closes In
      </p>
      <p style="color:#fff;font-size:48px;font-weight:900;margin:0;line-height:1;">
        ${opts.daysLeft}
      </p>
      <p style="color:#a5b4fc;font-size:16px;font-weight:600;margin:4px 0 0;">
        days — ${format(opts.windowCloses, "dd MMM yyyy")}
      </p>
    </div>
    <div style="background:#0f0f1a;border-radius:10px;padding:20px;margin-bottom:8px;">
      ${infoRow("Quarter",        opts.quarter)}
      ${infoRow("Deadline",       format(opts.windowCloses, "dd MMM yyyy"))}
      ${infoRow("Days Remaining", `${opts.daysLeft} days`)}
    </div>
    ${ctaButton("Submit Check-in Now", url, "#6366f1")}
    <p style="color:#ef4444;font-size:13px;text-align:center;font-weight:600;margin:0;">
      ⚠️ Late submissions are not accepted after the window closes.
    </p>
  `, `${opts.quarter} Check-in Reminder ⏰`);

  await sendEmail(
    opts.employeeEmail,
    `⏰ ${opts.daysLeft} days left — ${opts.quarter} check-in closes soon`,
    html
  );
};

// 5. Cycle Opened → All Employees
export const sendCycleOpenedEmail = async (opts: {
  employeeEmail: string;
  employeeName:  string;
  cycleName:     string;
  cycleEnd:      Date;
}) => {
  const url  = `${process.env.NEXT_PUBLIC_APP_URL}/employee/goals`;
  const html = baseTemplate(`
    <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Hi <strong style="color:#e2e8f0;">${opts.employeeName}</strong>,<br/>
      A new performance cycle has been launched. It's time to define your
      goals for the year. Set your targets, align with your thrust areas,
      and submit for manager approval.
    </p>
    <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);
                border-radius:12px;padding:24px;margin:0 0 24px;">
      <p style="color:#a5b4fc;font-size:13px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">
        New Cycle
      </p>
      <p style="color:#fff;font-size:28px;font-weight:900;margin:0;">
        ${opts.cycleName}
      </p>
      <p style="color:#818cf8;font-size:13px;margin:8px 0 0;">
        Goal setting closes: ${format(opts.cycleEnd, "dd MMM yyyy")}
      </p>
    </div>
    <div style="background:#0f0f1a;border-radius:10px;padding:20px;margin-bottom:8px;">
      ${infoRow("What to do",   "Create your goals")}
      ${infoRow("Min goals",    "1 goal")}
      ${infoRow("Max goals",    "8 goals")}
      ${infoRow("Weightage",    "All goals must total 100%")}
      ${infoRow("Min per goal", "10% weightage")}
    </div>
    ${ctaButton("Start Setting Goals", url)}
  `, `New Cycle Launched: ${opts.cycleName} 🚀`);

  await sendEmail(
    opts.employeeEmail,
    `🚀 New cycle launched — ${opts.cycleName}`,
    html
  );
};

// 6. Escalation Alert
export const sendEscalationEmail = async (opts: {
  to:           string;
  toName:       string;
  employeeName: string;
  trigger:      string;
  daysPassed:   number;
  level:        "manager" | "hr";
}) => {
  const html = baseTemplate(`
    <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Hi <strong style="color:#e2e8f0;">${opts.toName}</strong>,<br/>
      This is an escalation alert requiring your attention.
    </p>
    <div style="background:#450a0a;border:1px solid #991b1b;border-radius:10px;
                padding:20px;margin-bottom:16px;">
      <p style="color:#f87171;font-size:12px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">
        🚨 Escalation Alert
      </p>
      <div>
        ${infoRow("Employee",     opts.employeeName)}
        ${infoRow("Issue",        opts.trigger.replace(/_/g, " "))}
        ${infoRow("Days Overdue", `${opts.daysPassed} days`)}
        ${infoRow("Escalated To", opts.level === "hr" ? "HR / Admin" : "Manager")}
      </div>
    </div>
    <p style="color:#94a3b8;font-size:14px;text-align:center;margin:0;">
      Please take action immediately to resolve this issue.
    </p>
  `, "Action Required: Escalation Alert 🚨");

  await sendEmail(
    opts.to,
    `🚨 Escalation: ${opts.employeeName} — ${opts.trigger.replace(/_/g, " ")}`,
    html
  );
};
