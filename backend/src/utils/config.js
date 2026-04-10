// Centralized configuration management
require('dotenv').config();

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const requiredVars = ['JWT_SECRET'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please set these in your .env file or environment.'
    );
  }
  
  // Warn about default secrets in production
  if (process.env.JWT_SECRET.includes('your-secret') || 
      process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: Using weak JWT_SECRET in production!');
    console.warn('Please set a strong, random secret (min 32 characters)');
  }
}

module.exports = {
  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-change-in-production-min-32-chars',
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '24h',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  
  // Server
  PORT: parseInt(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database - PostgreSQL configuration
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME || 'athlete_monitoring',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DATABASE_URL: process.env.DATABASE_URL || null,
  
  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173'],
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
