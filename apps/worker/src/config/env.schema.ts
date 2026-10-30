import { z } from 'zod';

export const workerEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().min(1),
  WORKER_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  LLM_MOCK_MODE: z.enum(['happy', 'invalid']).default('happy'),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function validateWorkerEnv(
  config: Record<string, unknown>,
): WorkerEnv {
  const parsed = workerEnvSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid worker environment: ${details}`);
  }
  return parsed.data;
}
