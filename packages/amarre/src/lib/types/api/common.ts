import { z } from './zod-openapi';

export const ApiError = z
  .object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    cause: z.unknown().optional(),
  })
  .strict()
  .openapi('ApiError');

const PaginationMeta = z
  .object({
    page: z.number().int().min(1),
    per_page: z.number().int().min(1),
    total: z.number().int().nonnegative(),
  })
  .strict();

export const makeResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z
    .object({
      data: dataSchema.nullable().default(null),
      error: ApiError.nullable().default(null),
      meta: z.unknown().optional(),
    })
    .strict();

export type TApiError = z.infer<typeof ApiError>;
export type TPaginationMeta = z.infer<typeof PaginationMeta>;
