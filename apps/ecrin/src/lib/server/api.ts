/**
 * REDCap Service API Client
 *
 * @description
 * Client HTTP pour communiquer avec le microservice redcap-service interne.
 * Le mTLS est gere de maniere transparente par Cilium + SPIRE au niveau reseau.
 *
 * @remarks
 * Ce module ne doit etre utilise que cote serveur (SvelteKit load functions).
 * Le service redcap-service n'est pas expose publiquement (ClusterIP).
 *
 * @example
 * ```typescript
 * import { getRecords, checkHealth } from '$lib/server/api';
 *
 * // Dans une fonction load
 * export const load = async () => {
 *   const health = await checkHealth();
 *   const records = await getRecords();
 *   return { health, records };
 * };
 * ```
 *
 * @module
 */

/** URL du service redcap-service (interne au cluster) */
const REDCAP_SERVICE_URL = process.env.REDCAP_SERVICE_URL ?? 'http://redcap-service:3000';

/**
 * Erreur API avec code de statut HTTP
 */
export interface ApiError extends Error {
  /** Code de statut HTTP de l'erreur */
  status: number;
}

/**
 * Effectue une requete vers le service redcap-service
 *
 * @typeParam T - Type de la reponse attendue
 * @param path - Chemin de l'endpoint (ex: '/api/v1/records')
 * @param options - Options fetch additionnelles
 * @returns Promise avec la reponse JSON parsee
 * @throws {@link ApiError} Si la reponse n'est pas OK (status >= 400)
 *
 * @internal
 */
async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${REDCAP_SERVICE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = new Error(`REDCap service error: ${res.status} ${res.statusText}`) as ApiError;
    error.status = res.status;
    throw error;
  }

  return res.json();
}

/**
 * Verifie la sante du service redcap-service
 *
 * @returns Promise avec le statut du service
 *
 * @example
 * ```typescript
 * const health = await checkHealth();
 * console.log(health.status); // 'ok'
 * ```
 */
export async function checkHealth(): Promise<{ status: string }> {
  return fetchApi('/health');
}

/**
 * Enregistrement REDCap
 */
export interface Record {
  /** Identifiant unique du record */
  id: string;
  /** Donnees du record (champs REDCap) */
  data: Record<string, unknown>;
  /** Date de creation ISO 8601 */
  createdAt: string;
  /** Date de derniere modification ISO 8601 */
  updatedAt: string;
  /** Email du proprietaire (pour ABAC) */
  owner?: string;
}

/**
 * Recupere tous les records
 *
 * @returns Promise avec la liste des records
 *
 * @example
 * ```typescript
 * const records = await getRecords();
 * ```
 */
export async function getRecords(): Promise<Record[]> {
  return fetchApi('/api/v1/records');
}

/**
 * Recupere un record par son ID
 *
 * @param id - Identifiant du record
 * @returns Promise avec le record
 * @throws {@link ApiError} Si le record n'existe pas (404)
 *
 * @example
 * ```typescript
 * const record = await getRecord('123');
 * ```
 */
export async function getRecord(id: string): Promise<Record> {
  return fetchApi(`/api/v1/records/${encodeURIComponent(id)}`);
}

/**
 * Cree un nouveau record
 *
 * @param data - Donnees du record a creer
 * @returns Promise avec le record cree
 *
 * @example
 * ```typescript
 * const record = await createRecord({ name: 'Test', value: 42 });
 * ```
 */
export async function createRecord(data: Record<string, unknown>): Promise<Record> {
  return fetchApi('/api/v1/records', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Met a jour un record existant
 *
 * @param id - Identifiant du record
 * @param data - Nouvelles donnees
 * @returns Promise avec le record mis a jour
 * @throws {@link ApiError} Si le record n'existe pas (404)
 *
 * @example
 * ```typescript
 * const record = await updateRecord('123', { name: 'Updated' });
 * ```
 */
export async function updateRecord(id: string, data: Record<string, unknown>): Promise<Record> {
  return fetchApi(`/api/v1/records/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Supprime un record
 *
 * @param id - Identifiant du record
 * @throws {@link ApiError} Si le record n'existe pas (404)
 *
 * @remarks
 * La suppression est restreinte aux administrateurs via OPA policy.
 *
 * @example
 * ```typescript
 * await deleteRecord('123');
 * ```
 */
export async function deleteRecord(id: string): Promise<void> {
  await fetchApi(`/api/v1/records/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/**
 * Utilisateur du systeme
 */
export interface User {
  /** Identifiant unique */
  id: string;
  /** Adresse email */
  email: string;
  /** Nom d'affichage */
  name: string;
  /** Groupes d'appartenance (pour RBAC) */
  groups: string[];
}

/**
 * Recupere tous les utilisateurs
 *
 * @returns Promise avec la liste des utilisateurs
 *
 * @remarks
 * Accessible uniquement aux administrateurs.
 *
 * @example
 * ```typescript
 * const users = await getUsers();
 * ```
 */
export async function getUsers(): Promise<User[]> {
  return fetchApi('/api/v1/users');
}

/**
 * Recupere un utilisateur par son ID
 *
 * @param id - Identifiant de l'utilisateur
 * @returns Promise avec l'utilisateur
 * @throws {@link ApiError} Si l'utilisateur n'existe pas (404)
 *
 * @example
 * ```typescript
 * const user = await getUser('user-123');
 * ```
 */
export async function getUser(id: string): Promise<User> {
  return fetchApi(`/api/v1/users/${encodeURIComponent(id)}`);
}
