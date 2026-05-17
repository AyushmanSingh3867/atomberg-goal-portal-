# 🎯 Atomberg Goal Setting & Performance Governance Portal

A premium, enterprise-grade Goal Management & Performance Governance Portal designed for modern corporate organizations. Built with a unified high-impact dark glassmorphism design system.

---

## 🚀 Key Features

### 🔐 1. Enterprise SSO & Roles
* **Microsoft Azure AD SSO:** Fully integrated Single Sign-On using MSAL. Automatically maps incoming users to security groups and logs them in.
* **Role-Based Workspaces:** Secured routing guards for three user roles:
  * **Employee:** Set goals, view weights, log quarterly achievements.
  * **Manager:** Review & Approve/Return sheets, Deploy team goals, evaluate scores.
  * **Admin:** Manage goal cycles, unlock locked goal sheets, configure triggers, and view audit trails.

### 🎯 2. Dynamic Goal Validation Engine
* **Goal Setting constraints:** Automatically validates employee goal sheets live:
  * Total weightage must equal **exactly 100%**.
  * Minimum weightage of **10%** per goal.
  * Maximum of **8 goals** per sheet.
* **Badges:** Dynamic glowing status badges update in real-time as validation constraints pass.

### 📊 3. Reporting & Governance
* **Audit Trail:** Timestamped logs recording every critical action in the system (SSO Logins, Sheet Submissions, Approvals, Admin Unlocks).
* **Excel & CSV Export:** Download comprehensive goal reports structured with alternating color-coded formatting.
* **Analytics Board:** Dynamic QoQ trend lines visualizing employee progress across Q1-Q4.

### 🔌 4. Escalation Trigger Engine
* **Automated Rules:** Standardized trigger rules (e.g., *Remind employee if goals not submitted after 3 days*) with custom warning severities and active toggle switches.

---

## 🛠️ Technology Stack

* **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, Lucide Icons, Framer Motion.
* **Backend:** Express.js, TypeScript, Prisma ORM, Date-fns, ExcelJS.
* **Database:** PostgreSQL (Dockerized container).
* **Identity:** Microsoft MSAL (Azure Active Directory OAuth2).

---

## ⚙️ Quick Start Installation

Follow these steps to run the application locally in development mode:

### 1. Pre-requisites
Make sure you have **Node.js (v18+)** and **Docker Desktop** installed on your system.

### 2. Configure Environment Variables
Copy the backend environment variables template:
```bash
cd backend
cp .env.example .env
```
Fill in the database connections, email settings, and your Azure MSAL App Registration parameters.

### 3. Start Database via Docker
Start the PostgreSQL container:
```bash
docker-compose up -d
```

### 4. Install Dependencies & Build
Install and compile the full-stack system:
```bash
# In the backend directory
npm install
npx prisma db push
npx prisma db seed

# In the frontend directory
cd ../frontend
npm install
```

### 5. Launch the Portal
From the project root directory, run the launch script:
```powershell
.\START_DEMO.bat
```
* The Employee Goal Portal will be served at `http://localhost:3000`
* The API Server will be served at `http://localhost:5000`

---

## 👤 Seeded Local Testing Credentials

If you are running offline without Active Directory SSO, use these local accounts:
* **Admin:** `admin@atomberg.com` (Password: `password123`)
* **Manager:** `manager@atomberg.com` (Password: `password123`)
* **Employee (Approved):** `ayushman@atomberg.com` (Password: `password123`)
* **Employee (Pending):** `shreya@atomberg.com` (Password: `password123`)
