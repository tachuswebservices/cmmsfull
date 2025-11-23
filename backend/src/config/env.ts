import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  NODE_IP: process.env.IP || 'localhost',
  PORT: parseInt(process.env.PORT || '4000', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'change_me',
  DATABASE_URL: process.env.DATABASE_URL || '',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  // Runtime type/mode: set TYPE=demo to avoid sending real OTP SMS
  TYPE: process.env.TYPE || 'prod',
  // Twilio configuration (optional)
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID || '',
  TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER || '',
  // Fast2SMS configuration
  FAST2SMS_API_KEY: process.env.FAST2SMS_API_KEY || '',
  // SMTP (Nodemailer) configuration
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: process.env.SMTP_PORT || '587',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_SECURE: process.env.SMTP_SECURE || 'false',
  SMTP_FROM: process.env.SMTP_FROM || ''
};

export const paths = {
  projectRoot: process.cwd(),
  uploadDir: path.join(process.cwd(), env.UPLOAD_DIR)
};

