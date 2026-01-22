/**
 * Audit Logging
 *
 * @description
 * Logging structure JSON pour la tracabilite des acces et decisions de securite.
 * Les logs sont collectes par Loki et visualises dans Grafana.
 *
 * @remarks
 * Tous les logs sont emis en JSON structure pour faciliter:
 * - L'agregation par Loki
 * - Le filtrage par niveau (audit, security)
 * - L'analyse dans Grafana
 *
 * @example
 * ```typescript
 * import { auditLog, logAuthzDecision, logSecurityEvent } from '$lib/server/audit';
 *
 * // Logger une decision d'autorisation
 * logAuthzDecision('user@example.com', 'read', '/records/123', true);
 *
 * // Logger un evenement de securite
 * logSecurityEvent('failed_login', { email: 'unknown@example.com' }, { ip: clientIp });
 * ```
 *
 * @module
 */

/**
 * Evenement d'audit pour tracabilite
 */
export interface AuditEvent {
  /** Email de l'utilisateur (ou 'anonymous') */
  user: string;
  /** Action effectuee (ex: 'read', 'write', 'GET /records') */
  action: string;
  /** Ressource ciblee (ex: '/records/123') */
  resource: string;
  /** Decision d'autorisation */
  decision: 'allow' | 'deny';
  /** Raison de la decision (optionnel) */
  reason?: string;
  /** Contexte de la requete (optionnel) */
  context?: {
    /** Adresse IP du client */
    ip?: string;
    /** User-Agent du client */
    userAgent?: string;
    /** Score de risque calcule par OPA */
    riskScore?: number;
  };
}

/**
 * Emet un log d'audit structure en JSON
 *
 * @param event - Evenement d'audit a logger
 *
 * @remarks
 * Format de sortie:
 * ```json
 * {
 *   "timestamp": "2024-01-22T10:30:00.000Z",
 *   "level": "audit",
 *   "service": "ecrin",
 *   "user": "user@example.com",
 *   "action": "read",
 *   "resource": "/records/123",
 *   "decision": "allow"
 * }
 * ```
 *
 * @example
 * ```typescript
 * auditLog({
 *   user: 'researcher@univ-lehavre.fr',
 *   action: 'read',
 *   resource: '/records/123',
 *   decision: 'allow'
 * });
 * ```
 */
export function auditLog(event: AuditEvent): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'audit',
    service: 'ecrin',
    ...event,
  };

  // Structured JSON log - collected by Loki
  console.log(JSON.stringify(logEntry));
}

/**
 * Logger une decision d'autorisation
 *
 * @param user - Email de l'utilisateur
 * @param action - Action demandee
 * @param resource - Ressource ciblee
 * @param allowed - Decision (true = autorise)
 * @param reason - Raison de la decision (optionnel)
 *
 * @remarks
 * Raccourci pour les decisions d'autorisation OPA.
 * Utilise dans les load functions apres appel a `checkAuthorization`.
 *
 * @example
 * ```typescript
 * const allowed = await checkAuthorization(input);
 * logAuthzDecision(user.email, 'read', '/records', allowed);
 *
 * if (!allowed) {
 *   throw error(403, 'Access denied');
 * }
 * ```
 */
export function logAuthzDecision(
  user: string,
  action: string,
  resource: string,
  allowed: boolean,
  reason?: string
): void {
  auditLog({
    user,
    action,
    resource,
    decision: allowed ? 'allow' : 'deny',
    reason,
  });
}

/**
 * Logger un acces reussi
 *
 * @param user - Email de l'utilisateur
 * @param path - Chemin accede
 * @param method - Methode HTTP
 * @param context - Contexte de la requete (optionnel)
 *
 * @remarks
 * Utilise pour tracer les acces autorises (complementaire aux decisions OPA).
 *
 * @example
 * ```typescript
 * logAccess(user.email, '/dashboard', 'GET', {
 *   ip: getClientAddress(),
 *   userAgent: request.headers.get('user-agent')
 * });
 * ```
 */
export function logAccess(
  user: string,
  path: string,
  method: string,
  context?: { ip?: string; userAgent?: string }
): void {
  auditLog({
    user,
    action: `${method} ${path}`,
    resource: path,
    decision: 'allow',
    context,
  });
}

/**
 * Logger un evenement de securite
 *
 * @param event - Type d'evenement (ex: 'failed_login', 'suspicious_activity')
 * @param details - Details de l'evenement
 * @param context - Contexte de la requete (optionnel)
 *
 * @remarks
 * - Niveau 'security' (distinct de 'audit')
 * - Utilise pour les alertes et investigations
 * - Exemples: tentatives de connexion echouees, activite suspecte
 *
 * @example
 * ```typescript
 * // Tentative de connexion echouee
 * logSecurityEvent('failed_login', {
 *   email: 'unknown@example.com',
 *   reason: 'domain_not_allowed'
 * }, { ip: clientIp });
 *
 * // Acces a haut risque
 * logSecurityEvent('high_risk_access', {
 *   user: user.email,
 *   riskScore: 0.85,
 *   resource: '/records'
 * }, { ip: clientIp });
 * ```
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, unknown>,
  context?: { ip?: string; userAgent?: string }
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'security',
    service: 'ecrin',
    event,
    details,
    context,
  };

  console.log(JSON.stringify(logEntry));
}
