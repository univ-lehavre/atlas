import { getAllowedEmailsToSubscribe } from '$lib/appwrite/server/database';

export const isAlliance = async (email: string): Promise<boolean> => {
  const alliance = await getAllowedEmailsToSubscribe();
  const condition = alliance.some((domain) => email.match(`${domain}$`));
  return condition;
};

export const isHexadecimal = (str: string): boolean => {
  const HEX_RE = /^[0-9a-fA-F]+$/;
  const result = HEX_RE.test(str);
  return result;
};
