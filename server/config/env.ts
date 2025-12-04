import { config } from "dotenv";

// Load environment variables
config();

/**
 * Validate required environment variables at startup
 * Fail fast if critical configuration is missing
 */
export function validateEnvironment(): void {
  const required = ['DATABASE_URL', 'SESSION_SECRET'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check for weak session secret
  if (process.env.SESSION_SECRET &&
      (process.env.SESSION_SECRET === 'your_session_secret_here_generate_with_openssl' ||
       process.env.SESSION_SECRET.length < 32)) {
    console.error('❌ SECURITY ERROR: SESSION_SECRET is weak or default');
    console.error('   Please generate a strong secret: openssl rand -base64 32');
    process.exit(1);
  }

  if (missing.length > 0) {
    console.error('❌ ENVIRONMENT ERROR: Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  // Warnings for optional but recommended variables
  const warnings: string[] = [];

  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV not set, defaulting to development');
  }

  if (!process.env.PORT) {
    warnings.push('PORT not set, defaulting to 5000');
  }


  if (warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  console.log('✅ Environment validation passed');
}

/**
 * Get configuration with type safety and defaults
 */
export const env = {
  // Required
  DATABASE_URL: process.env.DATABASE_URL!,
  SESSION_SECRET: process.env.SESSION_SECRET!,

  // Optional with defaults
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),

  // File upload limits
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default

  // Admin credentials (for seeding only - should be changed after first login)
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'atallaabutaha@gmail.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin123',

  // Feature flags
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;
