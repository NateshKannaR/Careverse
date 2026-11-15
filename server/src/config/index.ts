import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or server directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'careverse-dev-jwt-secret-secure-key-2026!#@$',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Database / Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  // Email / Resend
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || 'CAREVERSE <notifications@careverse.health>',

  // AI Assistant (Optional external LLM key)
  aiApiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '',

  // Client URL for CORS
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Reminder Engine Configuration
  reminderCheckIntervalMs: 60 * 1000, // run every 60 seconds
  defaultGracePeriodMinutes: 30,
  defaultAdvanceNoticeMinutes: 15,
};
