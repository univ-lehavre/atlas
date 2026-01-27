import { AppwriteConsentEventRepository, AppwriteCurrentConsentRepository } from './repository';
import type { TConsentType, TCurrentConsent, TConsentStatusResponse } from './types';

const consentEventRepo = new AppwriteConsentEventRepository();
const currentConsentRepo = new AppwriteCurrentConsentRepository();

/**
 * Gets the current consent status for a user and consent type.
 * @param userId - The user ID
 * @param consentType - The consent type
 * @returns Consent status response
 */
export const getConsentStatus = async (
  userId: string,
  consentType: TConsentType
): Promise<TConsentStatusResponse> => {
  const current = await currentConsentRepo.get(userId, consentType);

  if (!current) {
    return {
      consentType,
      granted: null,
      updatedAt: null,
    };
  }

  return {
    consentType,
    granted: current.granted,
    updatedAt: current.$updatedAt,
  };
};

/**
 * Grants consent for a user and consent type.
 * Creates an audit event and updates current state.
 * @param userId - The user ID
 * @param consentType - The consent type
 * @returns Updated consent status
 */
export const grantConsent = async (
  userId: string,
  consentType: TConsentType
): Promise<TConsentStatusResponse> => {
  // Create audit event
  await consentEventRepo.create({
    userId,
    consentType,
    action: 'grant',
  });

  // Update current state
  const current = await currentConsentRepo.upsert(userId, consentType, true);

  return {
    consentType,
    granted: current.granted,
    updatedAt: current.$updatedAt,
  };
};

/**
 * Revokes consent for a user and consent type.
 * Creates an audit event and updates current state.
 * @param userId - The user ID
 * @param consentType - The consent type
 * @returns Updated consent status
 */
export const revokeConsent = async (
  userId: string,
  consentType: TConsentType
): Promise<TConsentStatusResponse> => {
  // Create audit event
  await consentEventRepo.create({
    userId,
    consentType,
    action: 'revoke',
  });

  // Update current state
  const current = await currentConsentRepo.upsert(userId, consentType, false);

  return {
    consentType,
    granted: current.granted,
    updatedAt: current.$updatedAt,
  };
};

/**
 * Checks if a user has granted a specific consent.
 * @param userId - The user ID
 * @param consentType - The consent type
 * @returns true if granted, false if denied or never asked
 */
export const hasConsent = async (userId: string, consentType: TConsentType): Promise<boolean> => {
  const current = await currentConsentRepo.get(userId, consentType);
  return current?.granted ?? false;
};

/**
 * Gets all current consents for a user.
 * @param userId - The user ID
 * @returns Map of consent type to current consent
 */
export const getAllConsents = async (
  userId: string
): Promise<Map<TConsentType, TCurrentConsent>> => {
  // For now we only have one consent type, but this is extensible
  const consentTypes: TConsentType[] = ['openalex_email'];
  const consents = new Map<TConsentType, TCurrentConsent>();

  for (const consentType of consentTypes) {
    const current = await currentConsentRepo.get(userId, consentType);
    if (current) {
      consents.set(consentType, current);
    }
  }

  return consents;
};
