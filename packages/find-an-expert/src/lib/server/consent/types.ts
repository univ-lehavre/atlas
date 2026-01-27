import { z } from 'zod';

/**
 * Appwrite datetime string validator.
 * Appwrite returns ISO dates with offset (+00:00) instead of Z suffix.
 * Example: "2024-01-15T12:30:45.123+00:00"
 */
const appwriteDatetime = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid datetime string' });

/**
 * Consent types supported by the system.
 */
export const ConsentType = z.enum(['openalex_email']);

export type TConsentType = z.infer<typeof ConsentType>;

/**
 * Consent action (grant or revoke).
 */
export const ConsentAction = z.enum(['grant', 'revoke']);

export type TConsentAction = z.infer<typeof ConsentAction>;

/**
 * Consent event record (immutable audit log).
 * Stored in consent-events collection.
 * Uses Appwrite's $createdAt system field for timestamp.
 */
export const ConsentEvent = z.object({
  userId: z.string(),
  consentType: ConsentType,
  action: ConsentAction,
  $createdAt: appwriteDatetime,
});

export type TConsentEvent = z.infer<typeof ConsentEvent>;

/**
 * Input for creating a consent event.
 * Does not include $createdAt as it's set automatically by Appwrite.
 */
export type TConsentEventInput = Omit<TConsentEvent, '$createdAt'>;

/**
 * Current consent state for a user.
 * Stored in current-consents collection.
 * Uses Appwrite's $updatedAt system field for last update time.
 */
export const CurrentConsent = z.object({
  userId: z.string(),
  consentType: ConsentType,
  granted: z.boolean(),
  $updatedAt: appwriteDatetime,
});

export type TCurrentConsent = z.infer<typeof CurrentConsent>;

/**
 * Response for consent status API.
 */
export const ConsentStatusResponse = z.object({
  consentType: ConsentType,
  granted: z.boolean().nullable(),
  updatedAt: appwriteDatetime.nullable(),
});

export type TConsentStatusResponse = z.infer<typeof ConsentStatusResponse>;
