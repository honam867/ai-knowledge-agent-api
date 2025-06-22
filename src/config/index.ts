import dotenv from 'dotenv';
import { EnvConfig } from '../types';

// Load environment variables
dotenv.config();

/**
 * Creates environment configuration object from process.env
 * Pure function that transforms environment variables
 */
export const createEnvConfig = (): EnvConfig => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  googleOAuth: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
  },
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
});

/**
 * Validates required environment variables
 * Pure function that checks configuration completeness
 */
export const validateEnvConfig = (config: EnvConfig): string[] => {
  const errors: string[] = [];

  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }

  // if (!config.jwtSecret || config.jwtSecret === 'fallback-secret-key') {
  //   errors.push('JWT_SECRET is required and should not use fallback value');
  // }

  // if (!config.googleApiKey) {
  //   errors.push('GOOGLE_API_KEY is required for AI features');
  // }

  return errors;
};

/**
 * Gets validated configuration or throws error
 * Function composition for config creation and validation
 */
export const getConfig = (): EnvConfig => {
  const config = createEnvConfig();
  const errors = validateEnvConfig(config);

  if (errors.length > 0) {
    throw new Error(`Configuration errors: ${errors.join(', ')}`);
  }

  return config;
};

// Export singleton configuration
export const config = getConfig();
