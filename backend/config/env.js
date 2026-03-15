/**
 * Environment Configuration
 * Validates and exports environment variables
 */

require('dotenv').config();

const requiredEnvVars = [
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
];

// Validate required environment variables
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

// Warn about missing optional API keys
if (!process.env.GROQ_API_KEY) {
  console.warn('⚠️  GROQ_API_KEY not set - AI features will use fallback responses');
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  openaiApiKey: process.env.OPENAI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
  uploadDir: process.env.UPLOAD_DIR || 'uploads/calls',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  // Email (Gmail SMTP — free)
  emailUser: process.env.EMAIL_USER,
  emailAppPassword: process.env.EMAIL_APP_PASSWORD,
  // Owner notification email (can be same as emailUser or different)
  ownerEmail: process.env.OWNER_EMAIL || process.env.EMAIL_USER,
  // WhatsApp Business Cloud API (free tier)
  whatsappToken: process.env.WHATSAPP_TOKEN,
  whatsappPhoneId: process.env.WHATSAPP_PHONE_ID,
  // Instagram Graph API (free)
  instagramToken: process.env.INSTAGRAM_ACCESS_TOKEN,
  instagramAccountId: process.env.INSTAGRAM_ACCOUNT_ID,
};
