import { getAllowedEmailsToSubscribe } from '$lib/appwrite/server/database';

// Re-export isHexadecimal from shared package
export { isHexadecimal } from '@univ-lehavre/atlas-validators';

/**
 * Checks if an email domain is in the allowed alliance list.
 * Fetches allowed domains from Appwrite database.
 *
 * @param email - The email to validate
 * @returns True if the email domain is in the alliance
 */
export const isAlliance = async (email: string): Promise<boolean> => {
  const alliance = await getAllowedEmailsToSubscribe();
  const condition = alliance.some((domain) => email.match(`${domain}$`));
  return condition;
};
