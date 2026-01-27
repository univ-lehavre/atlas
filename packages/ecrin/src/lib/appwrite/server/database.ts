import { createAdminClient } from '$lib/appwrite/server';
import {
  APPWRITE_DB_ID,
  APPWRITE_TABLE_ID_ALLOWED_EMAIL_DOMAINS_TO_SUBSCRIBE,
} from '$env/static/private';
import type { Models } from 'node-appwrite';

const getAllowedEmailsToSubscribe = async (): Promise<string[]> => {
  const emails: string[] = [];
  try {
    const { databases } = createAdminClient();
    const result: Models.RowList<Models.DefaultRow> = await databases.listRows({
      databaseId: APPWRITE_DB_ID,
      tableId: APPWRITE_TABLE_ID_ALLOWED_EMAIL_DOMAINS_TO_SUBSCRIBE,
    });
    console.log(result);
    result.rows.forEach((item) => {
      emails.push(item.regexp);
    });
  } catch (error) {
    console.error(error);
  }
  return emails;
};

export { getAllowedEmailsToSubscribe };
