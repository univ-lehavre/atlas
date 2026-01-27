import { z } from './zod-openapi';
import { makeResponseSchema } from './common';

export const User = z
  .object({ id: z.string(), email: z.email().nullable(), labels: z.array(z.string()) })
  .strict()
  .openapi('User');

export const ListUsersResponse = makeResponseSchema(z.array(User)).openapi('ListUsersResponse');

export const MeResponse = makeResponseSchema(User).openapi('MeResponse');

export type TUser = z.infer<typeof User>;

// Domaine: contrat pour récupérer les utilisateurs depuis une source (Appwrite, REDCap, etc.)
export interface UserRepository {
  getById(userId: string): Promise<TUser>;
}
