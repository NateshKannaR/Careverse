import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { ReminderEngine } from './services/reminderEngine.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patients.routes.js';
import medicationRoutes from './routes/medications.routes.js';
import appointmentRoutes from './routes/appointments.routes.js';
import careCircleRoutes from './routes/careCircle.routes.js';
import wellbeingRoutes from './routes/wellbeing.routes.js';
import careNotesRoutes from './routes/careNotes.routes.js';
import notificationRoutes from './routes/notifications.routes.js';
import careBuddyRoutes from './routes/careBuddy.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import emergencyRoutes from './routes/emergency.routes.js';
import auditRoutes from './routes/audit.routes.js';
import systemRoutes from './routes/system.routes.js';

export const app = express();

// Trust reverse proxy (Vercel, Cloud Run, load balancers)
app.set('trust proxy', 1);

// Security and middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allows flexible integration in dev/testing
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: '*', // Allow client connections
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Global rate limiting
app.use(['/api', '/auth', '/patients', '/medications', '/appointments', '/care-circle', '/wellbeing', '/care-notes', '/notifications', '/carebuddy', '/analytics', '/emergency', '/audit', '/system'], apiLimiter);

// API Route Mounts (Support both /api/* and /* for transparent Vercel service routing)
const routeList: [string, any][] = [
  ['/auth', authRoutes],
  ['/patients', patientRoutes],
  ['/medications', medicationRoutes],
  ['/appointments', appointmentRoutes],
  ['/care-circle', careCircleRoutes],
  ['/wellbeing', wellbeingRoutes],
  ['/care-notes', careNotesRoutes],
  ['/notifications', notificationRoutes],
  ['/carebuddy', careBuddyRoutes],
  ['/analytics', analyticsRoutes],
  ['/emergency', emergencyRoutes],
  ['/audit', auditRoutes],
  ['/system', systemRoutes]
];

for (const [routePath, routeHandler] of routeList) {
  app.use(`/api${routePath}`, routeHandler);
  app.use(routePath, routeHandler);
}

// Health check and diagnostic routes
app.get(['/', '/api'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'CAREVERSE Healthcare API Server',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString()
  });
});

app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Central error handler
app.use(errorHandler);

// Comprehensive serverless environment detection (Vercel, AWS Lambda)
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

// Only listen and start reminder cron if run directly as long-running server (not in tests or serverless lambdas)
if (process.env.NODE_ENV !== 'test' && !isServerless) {
  const server = app.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(` CAREVERSE Healthcare API Server running on port ${config.port}`);
    console.log(` Environment: ${config.nodeEnv}`);
    console.log(` Health check: http://localhost:${config.port}/api/system/health`);
    console.log(` Notification mode: ${config.resendApiKey ? 'Resend Production' : 'Simulator'}`);
    console.log(`=======================================================`);

    // Start background scheduled reminder engine
    ReminderEngine.start(config.reminderCheckIntervalMs);
  });

  const shutdown = () => {
    console.log('Shutting down gracefully...');
    ReminderEngine.stop();
    server.close(() => {
      console.log('Server process terminated.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default app;
