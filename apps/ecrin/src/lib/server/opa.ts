/**
 * OPA (Open Policy Agent) Client
 *
 * @description
 * Client pour les decisions d'autorisation fine RBAC/ABAC via Open Policy Agent.
 * Les policies sont definies en Rego dans `infra/opa/configmap.yaml`.
 *
 * @remarks
 * - Fail closed: en cas d'erreur, l'acces est refuse
 * - Les decisions sont loguees via le module audit
 * - OPA n'est pas expose publiquement (ClusterIP)
 *
 * @example
 * ```typescript
 * import { checkAuthorization } from '$lib/server/opa';
 *
 * const allowed = await checkAuthorization({
 *   user: { email: 'user@example.com', groups: ['researcher'] },
 *   action: 'read',
 *   resource: { type: 'record', id: '123' }
 * });
 *
 * if (!allowed) {
 *   throw error(403, 'Access denied');
 * }
 * ```
 *
 * @see {@link https://www.openpolicyagent.org/docs/latest/rest-api/|OPA REST API}
 *
 * @module
 */

/** URL du service OPA (interne au cluster) */
const OPA_URL = process.env.OPA_URL ?? 'http://opa:8181';

/** Timeout par defaut pour les appels OPA en millisecondes */
const OPA_TIMEOUT_MS = 5000;

/**
 * Input pour une decision d'autorisation OPA
 *
 * @remarks
 * Structure attendue par les policies Rego dans `ecrin.authz`
 */
export interface AuthzInput {
  /** Informations sur l'utilisateur */
  user: {
    /** Email de l'utilisateur (identifiant principal) */
    email: string;
    /** Groupes d'appartenance (admin, researcher, viewer, allowed-domain) */
    groups: string[];
  };
  /** Action demandee */
  action: 'read' | 'write' | 'delete';
  /** Ressource ciblee */
  resource: {
    /** Type de ressource */
    type: 'record' | 'user' | 'dashboard';
    /** Identifiant de la ressource (optionnel) */
    id?: string;
    /** Proprietaire de la ressource pour ABAC (optionnel) */
    owner?: string;
  };
  /** Contexte additionnel (optionnel) */
  context?: {
    /** Adresse IP du client */
    ip?: string;
    /** User-Agent du client */
    userAgent?: string;
  };
}

/**
 * Resultat d'une decision d'autorisation
 */
export interface AuthzResult {
  /** Decision: autorise ou non */
  allow: boolean;
  /** Raisons de la decision (pour audit) */
  reasons?: string[];
}

/**
 * Verifie l'autorisation d'une action via OPA
 *
 * @param input - Parametres de la decision d'autorisation
 * @returns `true` si l'action est autorisee, `false` sinon
 *
 * @remarks
 * - Fail closed: retourne `false` en cas d'erreur
 * - Consulte la policy `ecrin.authz.allow` dans OPA
 *
 * @example
 * ```typescript
 * // Verifier si un researcher peut lire un record
 * const canRead = await checkAuthorization({
 *   user: { email: 'researcher@univ-lehavre.fr', groups: ['researcher'] },
 *   action: 'read',
 *   resource: { type: 'record' }
 * });
 *
 * // Verifier si un user peut supprimer son propre record
 * const canDelete = await checkAuthorization({
 *   user: { email: 'user@example.com', groups: ['researcher'] },
 *   action: 'delete',
 *   resource: { type: 'record', id: '123', owner: 'user@example.com' }
 * });
 * ```
 */
export async function checkAuthorization(input: AuthzInput): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPA_TIMEOUT_MS);

  try {
    const res = await fetch(`${OPA_URL}/v1/data/ecrin/authz/allow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`OPA error: ${res.status} ${res.statusText}`);
      return false; // Fail closed
    }

    const data = await res.json();
    return data.result === true;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('OPA request timeout');
    } else {
      console.error('OPA connection error:', error);
    }
    return false; // Fail closed
  }
}

/**
 * Obtient le score de risque contextuel via OPA
 *
 * @param context - Contexte de la requete
 * @returns Score de risque entre 0 (faible) et 1 (eleve)
 *
 * @remarks
 * - Consulte la policy `ecrin.context.final_risk_score`
 * - Retourne 0.5 (risque moyen) en cas d'erreur
 * - Utilise pour les decisions adaptatives (step-up auth, etc.)
 *
 * @example
 * ```typescript
 * const risk = await getRiskScore({ ip: '192.168.1.100' });
 * if (risk > 0.7) {
 *   // Demander une authentification supplementaire
 * }
 * ```
 */
export async function getRiskScore(context: { ip: string }): Promise<number> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPA_TIMEOUT_MS);

  try {
    const res = await fetch(`${OPA_URL}/v1/data/ecrin/context/final_risk_score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { context } }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return 0.5; // Default medium risk
    }

    const data = await res.json();
    return typeof data.result === 'number' ? data.result : 0.5;
  } catch {
    clearTimeout(timeoutId);
    return 0.5;
  }
}

/**
 * Verifie si le contexte est a haut risque
 *
 * @param context - Contexte de la requete
 * @returns `true` si le risque est eleve
 *
 * @remarks
 * - Consulte la policy `ecrin.context.high_risk`
 * - Retourne `true` (assume high risk) en cas d'erreur
 *
 * @example
 * ```typescript
 * if (await isHighRisk({ ip: clientIp })) {
 *   logSecurityEvent('high_risk_access', { ip: clientIp });
 * }
 * ```
 */
export async function isHighRisk(context: { ip: string }): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPA_TIMEOUT_MS);

  try {
    const res = await fetch(`${OPA_URL}/v1/data/ecrin/context/high_risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { context } }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return true; // Assume high risk on error
    }

    const data = await res.json();
    return data.result === true;
  } catch {
    clearTimeout(timeoutId);
    return true;
  }
}
