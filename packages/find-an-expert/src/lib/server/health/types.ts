import { z } from 'zod';

/**
 * Health check status enum.
 */
export const HealthStatus = z.enum(['healthy', 'degraded', 'unhealthy']);
export type THealthStatus = z.infer<typeof HealthStatus>;

/**
 * Attribute health check result.
 */
export const AttributeHealth = z.object({
  name: z.string(),
  exists: z.boolean(),
  type: z.string().optional(),
});
export type TAttributeHealth = z.infer<typeof AttributeHealth>;

/**
 * Collection health check result.
 */
export const CollectionHealth = z.object({
  id: z.string(),
  name: z.string(),
  exists: z.boolean(),
  attributes: z.array(AttributeHealth).optional(),
  error: z.string().optional(),
});
export type TCollectionHealth = z.infer<typeof CollectionHealth>;

/**
 * Database health check result.
 */
export const DatabaseHealth = z.object({
  id: z.string(),
  name: z.string(),
  exists: z.boolean(),
  /** Whether the API key is valid */
  apiKeyValid: z.boolean().optional(),
  collections: z.array(CollectionHealth).optional(),
  error: z.string().optional(),
});
export type TDatabaseHealth = z.infer<typeof DatabaseHealth>;

/**
 * Individual service health check result.
 */
export const ServiceHealth = z.object({
  name: z.string(),
  status: HealthStatus,
  responseTimeMs: z.number().int().nonnegative().optional(),
  error: z.string().optional(),
  database: DatabaseHealth.optional(),
});
export type TServiceHealth = z.infer<typeof ServiceHealth>;

/**
 * Overall health check response.
 */
export const HealthCheckResponse = z.object({
  status: HealthStatus,
  timestamp: z.string(),
  services: z.array(ServiceHealth),
});
export type THealthCheckResponse = z.infer<typeof HealthCheckResponse>;
