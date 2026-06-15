const REQUIRED_VARS = [
  'DATABASE_URL',
  'REDIS_URL',
  'HMAC_SECRET',
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
] as const;

function parseCorsOrigins(value?: string): string[] {
  return (
    value
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? ['http://localhost:5173', 'http://localhost:4173']
  );
}

export default () => {
  const missing = REQUIRED_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    hmacSecret: process.env.HMAC_SECRET ?? '',
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
    // Distinct signing secret for JWTs. Falls back to HMAC_SECRET so existing
    // deployments keep working, but set a separate value in production so
    // rotating one secret doesn't invalidate the other.
    jwtSecret: process.env.JWT_SECRET ?? process.env.HMAC_SECRET ?? '',
  };
};
