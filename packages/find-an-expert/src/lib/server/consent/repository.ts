import { Query, ID, type Models } from 'node-appwrite';
import { createAdminClient } from '$lib/server/appwrite';
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_CONSENT_EVENTS_COLLECTION_ID,
  APPWRITE_CURRENT_CONSENTS_COLLECTION_ID,
} from '$env/static/private';
import {
  ConsentEvent,
  CurrentConsent,
  type TConsentEvent,
  type TConsentEventInput,
  type TCurrentConsent,
  type TConsentType,
} from './types';

/**
 * Repository for consent events (immutable audit log).
 */
export interface ConsentEventRepository {
  /**
   * Creates a new consent event.
   * @param event - The consent event to create
   * @returns Created consent event with $createdAt from Appwrite
   */
  create(event: TConsentEventInput): Promise<TConsentEvent>;

  /**
   * Gets all consent events for a user.
   * @param userId - The user ID
   * @param consentType - Optional filter by consent type
   * @returns List of consent events, ordered by $createdAt desc
   */
  getByUserId(userId: string, consentType?: TConsentType): Promise<TConsentEvent[]>;
}

/**
 * Repository for current consent state.
 */
export interface CurrentConsentRepository {
  /**
   * Gets current consent state for a user and consent type.
   * @param userId - The user ID
   * @param consentType - The consent type
   * @returns Current consent or null if not found
   */
  get(userId: string, consentType: TConsentType): Promise<TCurrentConsent | null>;

  /**
   * Updates or creates current consent state.
   * @param userId - The user ID
   * @param consentType - The consent type
   * @param granted - Whether consent is granted
   * @returns Updated current consent with $updatedAt from Appwrite
   */
  upsert(userId: string, consentType: TConsentType, granted: boolean): Promise<TCurrentConsent>;
}

/**
 * Appwrite implementation of consent event repository.
 * Uses Appwrite's $createdAt system field for event timestamp.
 */
export class AppwriteConsentEventRepository implements ConsentEventRepository {
  async create(event: TConsentEventInput): Promise<TConsentEvent> {
    const { databases } = createAdminClient();

    const created = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_CONSENT_EVENTS_COLLECTION_ID,
      ID.unique(),
      event
    );

    return this.parseDocument(created);
  }

  async getByUserId(userId: string, consentType?: TConsentType): Promise<TConsentEvent[]> {
    const { databases } = createAdminClient();

    const queries = [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ];

    if (consentType) {
      queries.push(Query.equal('consentType', consentType));
    }

    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_CONSENT_EVENTS_COLLECTION_ID,
      queries
    );

    return result.documents.map((doc) => this.parseDocument(doc));
  }

  private parseDocument(doc: Models.Document): TConsentEvent {
    const data = doc as unknown as Record<string, unknown>;
    return ConsentEvent.parse({
      userId: data.userId,
      consentType: data.consentType,
      action: data.action,
      $createdAt: doc.$createdAt,
    });
  }
}

/**
 * Appwrite implementation of current consent repository.
 * Uses Appwrite's $updatedAt system field for last update time.
 */
export class AppwriteCurrentConsentRepository implements CurrentConsentRepository {
  async get(userId: string, consentType: TConsentType): Promise<TCurrentConsent | null> {
    const { databases } = createAdminClient();

    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_CURRENT_CONSENTS_COLLECTION_ID,
      [Query.equal('userId', userId), Query.equal('consentType', consentType), Query.limit(1)]
    );

    if (result.documents.length === 0) {
      return null;
    }

    return this.parseDocument(result.documents[0]);
  }

  async upsert(
    userId: string,
    consentType: TConsentType,
    granted: boolean
  ): Promise<TCurrentConsent> {
    const { databases } = createAdminClient();

    const existing = await this.getWithDocId(userId, consentType);

    if (existing) {
      const updated = await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_CURRENT_CONSENTS_COLLECTION_ID,
        existing.docId,
        { granted }
      );
      return this.parseDocument(updated);
    }

    const created = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_CURRENT_CONSENTS_COLLECTION_ID,
      ID.unique(),
      { userId, consentType, granted }
    );

    return this.parseDocument(created);
  }

  private async getWithDocId(
    userId: string,
    consentType: TConsentType
  ): Promise<{ docId: string; consent: TCurrentConsent } | null> {
    const { databases } = createAdminClient();

    const result = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_CURRENT_CONSENTS_COLLECTION_ID,
      [Query.equal('userId', userId), Query.equal('consentType', consentType), Query.limit(1)]
    );

    if (result.documents.length === 0) {
      return null;
    }

    return {
      docId: result.documents[0].$id,
      consent: this.parseDocument(result.documents[0]),
    };
  }

  private parseDocument(doc: Models.Document): TCurrentConsent {
    const data = doc as unknown as Record<string, unknown>;
    return CurrentConsent.parse({
      userId: data.userId,
      consentType: data.consentType,
      granted: data.granted,
      $updatedAt: doc.$updatedAt,
    });
  }
}
