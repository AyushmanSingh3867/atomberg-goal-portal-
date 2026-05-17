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
  origin: ['http://localhost:3000', 'http://localhost:3001'],
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

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  await app.listen(PORT);
  console.log(`Server is running on port ${PORT}`);
  startEscalationCron();
}

start();
