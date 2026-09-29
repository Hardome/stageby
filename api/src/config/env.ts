import { z } from 'zod';

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    DATABASE_URL: z.string().refine(
      (value) => {
        try {
          const url = new URL(value);
          return url.protocol === 'postgres:' || url.protocol === 'postgresql:';
        } catch {
          return false;
        }
      },
      { message: 'DATABASE_URL должен содержать адрес PostgreSQL' },
    ),
    CORS_ORIGIN: z
      .string()
      .min(1)
      .transform((value) => value.split(',').map((origin) => origin.trim()))
      .pipe(z.array(z.url()).min(1)),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_TIME_WINDOW: z.string().min(1).default('1 minute'),
    LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
    LOGIN_RATE_LIMIT_TIME_WINDOW: z.string().min(1).default('1 minute'),
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(12).default(12),
    S3_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().min(1).optional(),
    S3_BUCKET: z.string().min(1).optional(),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    S3_FORCE_PATH_STYLE: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    S3_CREATE_BUCKET: z.enum(['true', 'false']).optional(),
    S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    FILE_CLEANUP_INTERVAL_SECONDS: z.coerce.number().int().min(10).max(86_400).default(86_400),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV !== 'production') return;
    for (const key of ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
      if (!environment[key]) {
        context.addIssue({ code: 'custom', path: [key], message: `${key} обязателен в production` });
      }
    }
  })
  .transform((environment) => ({
    ...environment,
    S3_ENDPOINT: environment.S3_ENDPOINT ?? 'http://127.0.0.1:9000',
    S3_REGION: environment.S3_REGION ?? 'us-east-1',
    S3_BUCKET: environment.S3_BUCKET ?? 'stageby',
    S3_ACCESS_KEY_ID: environment.S3_ACCESS_KEY_ID ?? 'stageby',
    S3_SECRET_ACCESS_KEY: environment.S3_SECRET_ACCESS_KEY ?? 'stageby-development',
    S3_CREATE_BUCKET:
      environment.S3_CREATE_BUCKET === undefined
        ? environment.NODE_ENV === 'development'
        : environment.S3_CREATE_BUCKET === 'true',
  }));

export type Environment = z.output<typeof environmentSchema>;

export function parseEnvironment(source: NodeJS.ProcessEnv): Environment {
  return environmentSchema.parse(source);
}
