import { z } from 'zod';

/**
 * Schema for user data.
 */
export const User = z
  .object({
    id: z.string(),
    email: z.string().email().nullable(),
    labels: z.array(z.string()),
  })
  .strict();

export type TUser = z.infer<typeof User>;

/**
 * Repository interface for fetching users from a data source.
 */
export interface UserRepository {
  getById(userId: string): Promise<TUser>;
}
