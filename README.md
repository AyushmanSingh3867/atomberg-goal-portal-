# 🎯 Atomberg Goal Setting & Performance Governance Portal

A premium, enterprise-grade Goal Management & Performance Governance Portal designed for modern corporate organizations. Featuring a unified, high-impact dark glassmorphism design system built with vanilla CSS tokens and fully reactive data synchronization.

---

## 🔗 Live Deployments

The portal is fully deployed and ready for live interaction:

* **🖥️ Live Web Application:** [https://atomberg-goal-portal.vercel.app](https://atomberg-goal-portal.vercel.app)
* **⚙️ Production Backend API:** [https://atomberg-backend.onrender.com](https://atomberg-backend.onrender.com)

---

## 👤 Seeded Testing Accounts

Use these pre-configured corporate accounts to experience the full end-to-end governance lifecycle:

| Role | Email Address | Password | Initial State / Testing Scenario |
| :--- | :--- | :--- | :--- |
| **👑 ADMIN** | `admin@atomberg.com` | `password123` | Active goal cycle controls, unlock goal sheets, warning logs, and audit trails. |
| **💼 MANAGER** | `manager@atomberg.com` | `password123` | Team goal sheets review, Approve / Return workflows, and team check-in notes. |
| **🧑‍💻 EMPLOYEE (Approved)** | `ayushman@atomberg.com` | `password123` | Has an **Approved** goal sheet. Ready to log and submit quarterly achievements. |
| **🧑‍💻 EMPLOYEE (Pending)** | `shreya@atomberg.com` | `password123` | Has a **Submitted** goal sheet. Ready for Manager approval to unlock check-ins. |

---

## 🚀 Key Features

### 🔑 1. Premium Login & Real-Time Sync
* **Overhauled SSO & Credentials:** Styled custom focus indicators matching brand indigo (`#6366f1`), glowing interactive borders, and inline failure-reporting states.
* **Instantaneous Data Load:** Complete asynchronous state synchronization. Logging in instantly loads names, roles, emails, and database records **on the very first frame without requiring a page reload!**

### 🎨 2. Unified High-Impact Design
* **Harmonized Headers:** Every page—Goal Setting, Check-in, Performance, Reports, Analytics, Escalation Rules, Logs, and Audits—follows a strict, premium layout:
  * Boxed, gradient-filled visual icon (`bg-indigo-500/10 rounded-xl border border-indigo-500/30`).
  * Double-gradient `font-extrabold text-4xl` titles (`bg-gradient-to-r from-indigo-400 to-purple-400`).
  * Subtitles aligned and properly spaced with high readability.
* **Responsive Sidebar:** Collapse-friendly sidebar with real-time alert badges, active window summaries, and a popover profile panel.

### 🎯 3. Dynamic Goal Validation Engine
* **Goal Setting Constraints:** Automatically validates employee goal sheets live inside a premium two-column workspace:
  * Total weightage must equal **exactly 100%**.
  * Minimum weightage of **10%** per goal.
  * Maximum of **8 goals** per sheet.
* **Interactive Active Cards:** Dynamic active summaries filter system-wide metrics and display active cycles instantly.

### 📊 4. Reporting, Analytics & Auditing
* **Interactive Charts:** Beautiful QoQ trend graphs and achievement completion tracking.
* **Excel & CSV Export:** Download data directly from the reports workspace, beautifully structured with alternating color patterns.
* **Audit Trail:** Timestamped security logs tracking every critical event (logins, goal sheet updates, approvals, administrative overrides).

### 🔌 5. Escalation Engine
* **Trigger Rules:** Dynamic automated rules (e.g. *Remind employee if goals not submitted after 3 days*) with custom warn levels and active switches.

---

## 🛠️ Technology Stack

* **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, Lucide Icons, Framer Motion.
* **Backend:** Express.js, TypeScript, Prisma ORM, Date-fns, ExcelJS.
* **Database:** PostgreSQL.
* **Identity:** Microsoft MSAL (Azure Active Directory OAuth2).
