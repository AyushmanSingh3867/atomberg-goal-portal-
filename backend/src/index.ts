import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import goalsRoutes from './routes/goals';
import managerRoutes from './routes/manager';
import achievementRoutes from './routes/achievements';
import checkinRoutes from './routes/checkins';
import adminRoutes from './routes/admin';
import reportRoutes from './modules/reports/reports.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import escalationRoutes from './modules/escalation/escalation.routes';
import azureRoutes from './modules/auth/azure.routes';
import { startEscalationCron } from './modules/escalation/escalation.cron';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://atomberg-goal-portal.vercel.app',
    process.env.FRONTEND_URL || '',
    process.env.NEXT_PUBLIC_APP_URL || ''
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth",       authRoutes);
app.use("/api/auth/azure", azureRoutes);
app.use("/api/goals",      goalsRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/escalation', escalationRoutes);
app.use('/api/windows', achievementRoutes);  // /api/windows/active

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Atomberg Goal Portal API</title>
        <style>
          body {
            background-color: #05050a;
            color: #f1f5f9;
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
          }
          .card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(99, 102, 241, 0.2);
            border-radius: 24px;
            padding: 48px;
            text-align: center;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            max-width: 480px;
            backdrop-filter: blur(12px);
          }
          .icon {
            font-size: 48px;
            margin-bottom: 24px;
            animation: pulse 2s infinite ease-in-out;
          }
          h1 {
            font-size: 28px;
            font-weight: 800;
            margin: 0 0 12px 0;
            background: linear-gradient(to right, #818cf8, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          p {
            color: #94a3b8;
            font-size: 15px;
            line-height: 1.6;
            margin: 0 0 24px 0;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: #34d399;
            padding: 8px 16px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🚀</div>
          <h1>Atomberg Goal Portal API</h1>
          <p>The enterprise-grade backend services are fully functional, healthy, and successfully deployed to Production.</p>
          <div class="badge">
            <span style="display:inline-block; width:8px; height:8px; background:#10b981; border-radius:50%"></span>
            Active & Running
          </div>
        </div>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  await app.listen(PORT);
  console.log(`Server is running on port ${PORT}`);
  startEscalationCron();
}

start();
