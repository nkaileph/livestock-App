import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('5000'),
  API_VERSION: z.string().default('v1'),
  MONGODB_URI: z.string(),
  MONGODB_URI_PROD: z.string().optional(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  EMAIL_HOST: z.string(),
  EMAIL_PORT: z.string(),
  EMAIL_USER: z.string(),
  EMAIL_PASSWORD: z.string(),
  EMAIL_FROM: z.string(),
  FRONTEND_URL: z.string(),
  FRONTEND_URL_PROD: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('5'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.format());
  process.exit(1);
}

export const env = {
  ...parsed.data,
  PORT: Number(parsed.data.PORT),
  EMAIL_PORT: Number(parsed.data.EMAIL_PORT),
  RATE_LIMIT_WINDOW_MS: Number(parsed.data.RATE_LIMIT_WINDOW_MS),
  RATE_LIMIT_MAX_REQUESTS: Number(parsed.data.RATE_LIMIT_MAX_REQUESTS),
};
