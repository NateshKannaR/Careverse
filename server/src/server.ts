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
app.use('/api', apiLimiter);

// API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/care-circle', careCircleRoutes);
app.use('/api/wellbeing', wellbeingRoutes);
app.use('/api/care-notes', careNotesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/carebuddy', careBuddyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/system', systemRoutes);

// Central error handler
app.use(errorHandler);

// Only listen and start reminder cron if run directly (not during unit tests)
if (process.env.NODE_ENV !== 'test') {
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
