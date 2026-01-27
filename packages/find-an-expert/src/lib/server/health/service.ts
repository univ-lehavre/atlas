import {
  APPWRITE_ENDPOINT,
  APPWRITE_DATABASE_ID,
  APPWRITE_CONSENT_EVENTS_COLLECTION_ID,
  APPWRITE_CURRENT_CONSENTS_COLLECTION_ID,
} from '$env/static/private';
import { createAdminClient } from '$lib/server/appwrite';
import type {
  THealthCheckResponse,
  TServiceHealth,
  THealthStatus,
  TDatabaseHealth,
  TCollectionHealth,
  TAttributeHealth,
} from './types';

/** Timeout for health checks in milliseconds */
const HEALTH_CHECK_TIMEOUT_MS = 5000;

/** External URL to check internet connectivity */
const INTERNET_CHECK_URL = 'https://www.google.com';

/** Expected attributes for consent-events collection */
const CONSENT_EVENTS_EXPECTED_ATTRIBUTES = ['userId', 'consentType', 'action'];

/** Expected attributes for current-consents collection */
const CURRENT_CONSENTS_EXPECTED_ATTRIBUTES = ['userId', 'consentType', 'granted'];

/**
 * Checks if a URL is reachable within the timeout.
 * @param url - The URL to check
 * @param timeoutMs - Timeout in milliseconds
 * @returns Object with success status and response time
 */
const checkUrl = async (
  url: string,
  timeoutMs: number = HEALTH_CHECK_TIMEOUT_MS
): Promise<{ success: boolean; responseTimeMs: number; error?: string }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    const responseTimeMs = Math.round(performance.now() - startTime);
    clearTimeout(timeoutId);

    return {
      success: response.ok || response.status < 500,
      responseTimeMs,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const responseTimeMs = Math.round(performance.now() - startTime);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = `Connection timeout (>${timeoutMs}ms)`;
      } else if (error.cause && typeof error.cause === 'object' && 'code' in error.cause) {
        const cause = error.cause as { code: string; address?: string };
        switch (cause.code) {
          case 'ETIMEDOUT':
            errorMessage = `Connection timed out to ${cause.address || 'server'}`;
            break;
          case 'ECONNREFUSED':
            errorMessage = 'Connection refused - server may be down';
            break;
          case 'ENOTFOUND':
            errorMessage = 'DNS lookup failed - hostname not found';
            break;
          case 'ENETUNREACH':
            errorMessage = 'Network unreachable';
            break;
          default:
            errorMessage = `Network error: ${cause.code}`;
        }
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      responseTimeMs,
      error: errorMessage,
    };
  }
};

/**
 * Checks Appwrite server health (endpoint reachability only).
 */
const checkAppwriteEndpoint = async (): Promise<TServiceHealth> => {
  const healthUrl = `${APPWRITE_ENDPOINT}/health`;
  const result = await checkUrl(healthUrl);

  return {
    name: 'appwrite',
    status: result.success ? 'healthy' : 'unhealthy',
    responseTimeMs: result.responseTimeMs,
    error: result.error,
  };
};

/**
 * Checks Appwrite server health including database, collections, and attributes.
 * Also verifies project existence and API key validity.
 */
const checkAppwrite = async (): Promise<TServiceHealth> => {
  const startTime = performance.now();

  // First check endpoint reachability
  const endpointCheck = await checkAppwriteEndpoint();

  if (endpointCheck.status === 'unhealthy') {
    return endpointCheck;
  }

  // Then check database configuration
  const database = await checkAppwriteDatabase();
  const responseTimeMs = Math.round(performance.now() - startTime);

  // Determine status based on database check
  let status: THealthStatus = 'healthy';
  let error: string | undefined;

  if (!database.exists) {
    status = 'unhealthy';
    error = database.error;
  } else if (database.collections) {
    // Check if any collection is missing
    const missingCollections = database.collections.filter((c) => !c.exists);
    if (missingCollections.length > 0) {
      status = 'degraded';
      error = `Missing collections: ${missingCollections.map((c) => c.id).join(', ')}`;
    }

    // Check if any attribute is missing
    const missingAttributes = database.collections
      .filter((c) => c.exists && c.attributes)
      .flatMap((c) => c.attributes!.filter((a) => !a.exists).map((a) => `${c.id}.${a.name}`));

    if (missingAttributes.length > 0) {
      if (status !== 'degraded') {
        status = 'degraded';
      }
      error = error
        ? `${error}; Missing attributes: ${missingAttributes.join(', ')}`
        : `Missing attributes: ${missingAttributes.join(', ')}`;
    }
  }

  return {
    name: 'appwrite',
    status,
    responseTimeMs,
    error,
    database,
  };
};

/**
 * Checks internet connectivity.
 */
const checkInternet = async (): Promise<TServiceHealth> => {
  const result = await checkUrl(INTERNET_CHECK_URL);

  return {
    name: 'internet',
    status: result.success ? 'healthy' : 'unhealthy',
    responseTimeMs: result.responseTimeMs,
    error: result.error,
  };
};

/**
 * Checks collection attributes against expected list.
 * @param collectionId - The collection ID
 * @param expectedAttributes - List of expected attribute names
 * @returns Attribute health check results
 */
const checkCollectionAttributes = async (
  collectionId: string,
  expectedAttributes: string[]
): Promise<TAttributeHealth[]> => {
  try {
    const { databases } = createAdminClient();
    const attributes = await databases.listAttributes(APPWRITE_DATABASE_ID, collectionId);

    const attributeNames = new Set(attributes.attributes.map((attr) => attr.key));

    return expectedAttributes.map((name) => ({
      name,
      exists: attributeNames.has(name),
      type: attributes.attributes.find((attr) => attr.key === name)?.type,
    }));
  } catch {
    return expectedAttributes.map((name) => ({
      name,
      exists: false,
    }));
  }
};

/**
 * Checks a single collection existence and attributes.
 * @param collectionId - The collection ID
 * @param expectedAttributes - List of expected attribute names
 * @returns Collection health check result
 */
const checkCollection = async (
  collectionId: string,
  expectedAttributes: string[]
): Promise<TCollectionHealth> => {
  try {
    const { databases } = createAdminClient();
    const collection = await databases.getCollection(APPWRITE_DATABASE_ID, collectionId);

    const attributes = await checkCollectionAttributes(collectionId, expectedAttributes);

    return {
      id: collectionId,
      name: collection.name,
      exists: true,
      attributes,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Collection not found or inaccessible';
    return {
      id: collectionId,
      name: collectionId,
      exists: false,
      error: errorMessage,
    };
  }
};

/**
 * Checks Appwrite database, collections, and their attributes.
 * Also verifies project and API key validity.
 * @returns Database health check result
 */
const checkAppwriteDatabase = async (): Promise<TDatabaseHealth> => {
  try {
    const { databases } = createAdminClient();

    // First, try to get the database (this validates project + API key + database existence)
    const database = await databases.get(APPWRITE_DATABASE_ID);

    // Check collections
    const collections = await Promise.all([
      checkCollection(APPWRITE_CONSENT_EVENTS_COLLECTION_ID, CONSENT_EVENTS_EXPECTED_ATTRIBUTES),
      checkCollection(
        APPWRITE_CURRENT_CONSENTS_COLLECTION_ID,
        CURRENT_CONSENTS_EXPECTED_ATTRIBUTES
      ),
    ]);

    return {
      id: APPWRITE_DATABASE_ID,
      name: database.name,
      exists: true,
      apiKeyValid: true,
      collections,
    };
  } catch (error) {
    let errorMessage = 'Unknown error';
    let apiKeyValid: boolean | undefined = undefined;

    if (error instanceof Error) {
      // Parse Appwrite error codes
      if (
        error.message.includes('Invalid API key') ||
        error.message.includes('Invalid `X-Appwrite-Key`')
      ) {
        errorMessage = 'Invalid API key - check APPWRITE_KEY';
        apiKeyValid = false;
      } else if (error.message.includes('project') || error.message.includes('Project')) {
        errorMessage = 'Project not found - check APPWRITE_PROJECT';
        apiKeyValid = true; // API key is valid but project doesn't exist
      } else if (error.message.includes('database') || error.message.includes('Database')) {
        errorMessage = 'Database not found - check APPWRITE_DATABASE_ID';
        apiKeyValid = true; // API key is valid but database doesn't exist
      } else {
        errorMessage = error.message;
      }
    }

    return {
      id: APPWRITE_DATABASE_ID || 'not-configured',
      name: 'Database',
      exists: false,
      apiKeyValid,
      error: errorMessage,
    };
  }
};

/**
 * Determines overall health status from service health checks.
 */
const determineOverallStatus = (services: TServiceHealth[]): THealthStatus => {
  const hasUnhealthy = services.some((s) => s.status === 'unhealthy');
  const hasDegraded = services.some((s) => s.status === 'degraded');

  if (hasUnhealthy) return 'unhealthy';
  if (hasDegraded) return 'degraded';
  return 'healthy';
};

/**
 * Performs a full health check of all services.
 * Internet connectivity is only checked if Appwrite is unreachable.
 * @returns Health check response with status of all services
 */
export const performHealthCheck = async (): Promise<THealthCheckResponse> => {
  const appwrite = await checkAppwrite();
  const services: TServiceHealth[] = [appwrite];

  // Only check internet connectivity if Appwrite is unreachable
  if (appwrite.status === 'unhealthy') {
    const internet = await checkInternet();
    services.push(internet);
  }

  const status = determineOverallStatus(services);

  return {
    status,
    timestamp: new Date().toISOString(),
    services,
  };
};
