import { createAdminClient } from '$lib/baas/server';
import { appwriteDbId, appwriteTableIdAllowedEmailDomainsToSubscribe } from '$lib/server/env';
import type { Models } from 'node-appwrite';

const getAllowedEmailsToSubscribe = async (): Promise<string[]> => {
  const emails: string[] = [];
  try {
    const { databases } = createAdminClient();
    const result: Models.RowList = await databases.listRows({
      databaseId: appwriteDbId(),
      tableId: appwriteTableIdAllowedEmailDomainsToSubscribe(),
    });
    console.log(result);
    for (const item of result.rows) {
      emails.push(item.regexp);
    }
  } catch (error) {
    console.error(error);
  }
  return emails;
};

export { getAllowedEmailsToSubscribe };
