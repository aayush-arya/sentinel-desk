export interface AppConfig {
  nodeEnv: string;
  appName: string;
  frontendUrl: string;
  backendUrl: string;
  port: number;
  database: { url: string };
  redis: { host: string; port: number; url: string };
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
    refreshExpiresInRememberMe: string;
  };
  cookie: { secret: string; domain: string; secure: boolean };
  mail: {
    host: string;
    port: number;
    user: string;
    password: string;
    from: string;
    secure: boolean;
  };
  storage: {
    endpoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
    region: string;
  };
  ai: {
    provider: 'anthropic' | 'openai' | 'mock';
    anthropicApiKey: string;
    anthropicModel: string;
    openaiApiKey: string;
    openaiModel: string;
  };
  throttle: { ttl: number; limit: number };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  appName: process.env.APP_NAME ?? 'SentinelDesk',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL ?? 'http://localhost:4000',
  port: parseInt(process.env.BACKEND_PORT ?? '4000', 10),
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    refreshExpiresInRememberMe:
      process.env.JWT_REFRESH_EXPIRES_IN_REMEMBER_ME ?? '30d',
  },
  cookie: {
    secret: process.env.COOKIE_SECRET ?? '',
    domain: process.env.COOKIE_DOMAIN ?? 'localhost',
    secure: process.env.COOKIE_SECURE === 'true',
  },
  mail: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.SMTP_FROM ?? 'SentinelDesk <no-reply@sentineldesk.local>',
    secure: process.env.SMTP_SECURE === 'true',
  },
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT ?? 'localhost',
    port: parseInt(process.env.STORAGE_PORT ?? '9000', 10),
    useSSL: process.env.STORAGE_USE_SSL === 'true',
    accessKey: process.env.STORAGE_ACCESS_KEY ?? '',
    secretKey: process.env.STORAGE_SECRET_KEY ?? '',
    bucket: process.env.STORAGE_BUCKET ?? 'sentinel-desk',
    region: process.env.STORAGE_REGION ?? 'us-east-1',
  },
  ai: {
    provider: (process.env.AI_PROVIDER as 'anthropic' | 'openai' | 'mock') ?? 'mock',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
});
