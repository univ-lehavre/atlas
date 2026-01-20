import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  REDCAP_API_URL: z.string().url(),
  REDCAP_API_TOKEN: z.string().min(1),
});

export const env = envSchema.parse(process.env);
