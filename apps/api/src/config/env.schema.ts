import { z } from 'zod';

export const apiEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function validateApiEnv(
  config: Record<string, unknown>,
): ApiEnv {
  const parsed = apiEnvSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid API environment: ${details}`);
  }
  return parsed.data;
}
