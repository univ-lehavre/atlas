# Système de fiabilisation auteur (Atlas Verify)

Ce document décrit le système permettant aux auteurs de fiabiliser leurs données bibliographiques agrégées depuis les différentes sources.

> **Voir aussi :**
> - [Bases de données](./database-analysis.md) - Analyse PostgreSQL, MongoDB et choix de stockage
> - [Bases avancées & Recherche](./advanced-databases.md) - ArangoDB, vector search, fédération multi-bases
> - [Schéma unifié](./unified-schema.md) - Spécification des entités Work, Author, etc.

## Problématique

Les sources bibliographiques présentent des problèmes de qualité récurrents :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROBLÈMES DE QUALITÉ DES DONNÉES                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  HOMONYMIE                         FRAGMENTATION                            │
│  ───────────                       ─────────────                            │
│  "Jean Martin" = 15k+ auteurs      Même auteur avec :                       │
│  différents dans OpenAlex          - 3 ORCID différents                     │
│                                    - "J. Martin", "Jean Martin", "J-P Martin"│
│                                    - Affiliations incohérentes              │
│                                                                              │
│  ATTRIBUTION ERRONÉE               DONNÉES MANQUANTES                       │
│  ──────────────────                ─────────────────                        │
│  Article attribué au mauvais       - DOI absent                             │
│  "Jean Martin" par l'algorithme    - ORCID non lié                          │
│  de désambiguïsation               - Affiliation inconnue                   │
│                                    - Date approximative                     │
│                                                                              │
│  DOUBLONS                          VERSIONS MULTIPLES                       │
│  ────────                          ─────────────────                        │
│  Même article avec 3 DOI :         - Preprint ArXiv                         │
│  - DOI éditeur                     - Version acceptée                       │
│  - DOI Crossref                    - Version publiée                        │
│  - DOI DataCite (données)          - Erratum                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Vue d'ensemble du système

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ATLAS VERIFY - ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │   Sources   │────>│   Ingestion │────>│  Raw Store  │                   │
│  │ (OpenAlex,  │     │   Service   │     │ (immutable) │                   │
│  │  Crossref,  │     └─────────────┘     └──────┬──────┘                   │
│  │  HAL, etc.) │                                │                          │
│  └─────────────┘                                │                          │
│                                                 ▼                          │
│                                        ┌─────────────┐                     │
│                                        │  Reconciler │                     │
│                                        │  (matching) │                     │
│                                        └──────┬──────┘                     │
│                                                │                          │
│         ┌──────────────────────────────────────┼───────────────────┐      │
│         │                                      │                    │      │
│         ▼                                      ▼                    ▼      │
│  ┌─────────────┐                      ┌─────────────┐     ┌─────────────┐ │
│  │  Candidate  │                      │   Author    │     │   Work      │ │
│  │   Matches   │<────────────────────>│  Profiles   │<───>│  Registry   │ │
│  │  (pending)  │                      │ (verified)  │     │ (canonical) │ │
│  └──────┬──────┘                      └──────┬──────┘     └─────────────┘ │
│         │                                    │                            │
│         │         ┌─────────────┐            │                            │
│         └────────>│    Web UI   │<───────────┘                            │
│                   │ (Verify App)│                                         │
│                   └──────┬──────┘                                         │
│                          │                                                │
│                          ▼                                                │
│                   ┌─────────────┐                                         │
│                   │  Decisions  │                                         │
│                   │   (audit)   │                                         │
│                   └─────────────┘                                         │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Modèle de données

### Principes fondamentaux

1. **Immutabilité des données brutes** : Les données importées ne sont jamais modifiées
2. **Traçabilité complète** : Chaque décision est horodatée et attribuée
3. **Versioning** : Historique complet des états
4. **Séparation données/décisions** : Les assertions utilisateur sont stockées séparément

### Schéma conceptuel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MODÈLE DE DONNÉES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐         ┌─────────────────┐                           │
│  │   RawRecord     │         │  AuthorProfile  │                           │
│  ├─────────────────┤         ├─────────────────┤                           │
│  │ id              │         │ id              │                           │
│  │ source          │◄────────│ primaryOrcid    │                           │
│  │ sourceId        │         │ displayName     │                           │
│  │ entityType      │         │ email           │                           │
│  │ data (JSONB)    │         │ institution     │                           │
│  │ fetchedAt       │         │ createdAt       │                           │
│  │ checksum        │         │ updatedAt       │                           │
│  └────────┬────────┘         └────────┬────────┘                           │
│           │                           │                                     │
│           │  N:M                      │ 1:N                                │
│           ▼                           ▼                                     │
│  ┌─────────────────┐         ┌─────────────────┐                           │
│  │ CandidateMatch  │         │ ProfileIdentity │                           │
│  ├─────────────────┤         ├─────────────────┤                           │
│  │ id              │         │ id              │                           │
│  │ rawRecordId     │         │ profileId       │                           │
│  │ profileId       │         │ identifierType  │                           │
│  │ entityType      │         │ identifierValue │                           │
│  │ matchScore      │         │ isPrimary       │                           │
│  │ matchReason     │         │ verifiedAt      │                           │
│  │ status          │         └─────────────────┘                           │
│  │ createdAt       │                                                       │
│  └────────┬────────┘                                                       │
│           │                                                                 │
│           │ 1:N                                                            │
│           ▼                                                                 │
│  ┌─────────────────┐         ┌─────────────────┐                           │
│  │ VerificationAct │         │ CanonicalWork   │                           │
│  ├─────────────────┤         ├─────────────────┤                           │
│  │ id              │         │ id              │                           │
│  │ candidateId     │         │ primaryDoi      │                           │
│  │ profileId       │         │ title           │                           │
│  │ decision        │◄───────>│ publicationDate │                           │
│  │ confidence      │         │ mergedFrom[]    │                           │
│  │ notes           │         │ createdAt       │                           │
│  │ decidedAt       │         │ updatedAt       │                           │
│  │ decidedBy       │         └────────┬────────┘                           │
│  │ evidence[]      │                  │                                    │
│  └─────────────────┘                  │ 1:N                                │
│                                       ▼                                    │
│                              ┌─────────────────┐                           │
│                              │  WorkAuthorship │                           │
│                              ├─────────────────┤                           │
│                              │ workId          │                           │
│                              │ profileId       │                           │
│                              │ position        │                           │
│                              │ isCorresponding │                           │
│                              │ verificationId  │                           │
│                              │ rawContribs[]   │                           │
│                              └─────────────────┘                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Définitions TypeScript

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// DONNÉES BRUTES (IMMUTABLES)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Enregistrement brut importé d'une source.
 * JAMAIS modifié après création.
 */
interface RawRecord {
  /** UUID v7 (time-sortable) */
  id: string;

  /** Source d'origine */
  source: SourceType;

  /** Identifiant dans la source (DOI, OpenAlex ID, etc.) */
  sourceId: string;

  /** Type d'entité */
  entityType: 'work' | 'author' | 'institution';

  /** Données brutes complètes (JSONB) */
  data: unknown;

  /** Timestamp d'import */
  fetchedAt: Date;

  /** SHA-256 des données pour déduplication */
  checksum: string;

  /** Version de l'API source au moment du fetch */
  sourceApiVersion?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILS AUTEUR (VÉRIFIÉS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Profil auteur vérifié et géré par l'utilisateur.
 */
interface AuthorProfile {
  /** UUID v7 */
  id: string;

  /** ORCID principal (source de vérité pour l'identité) */
  primaryOrcid?: string;

  /** Nom affiché préféré */
  displayName: string;

  /** Email institutionnel (pour authentification) */
  email?: string;

  /** Institution principale actuelle */
  institutionId?: string;

  /** URL avatar */
  avatarUrl?: string;

  /** Biographie courte */
  bio?: string;

  /** Paramètres utilisateur */
  settings: AuthorSettings;

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

interface AuthorSettings {
  /** Notifications email */
  emailNotifications: boolean;

  /** Fréquence de notification */
  notificationFrequency: 'immediate' | 'daily' | 'weekly';

  /** Sources à surveiller */
  watchedSources: SourceType[];

  /** Auto-confirmer les matches haute confiance */
  autoConfirmThreshold?: number;  // 0.0 - 1.0, null = désactivé

  /** Visibilité du profil */
  visibility: 'public' | 'institution' | 'private';
}

/**
 * Identité associée au profil (ORCID, email, OpenAlex ID, etc.)
 */
interface ProfileIdentity {
  id: string;
  profileId: string;

  /** Type d'identifiant */
  identifierType:
    | 'orcid'
    | 'email'
    | 'openalex_author'
    | 'hal_author'
    | 's2_author'
    | 'scopus_author'
    | 'dblp_author'
    | 'researcher_id'
    | 'name_variant';

  /** Valeur de l'identifiant */
  identifierValue: string;

  /** Est l'identifiant principal de ce type ? */
  isPrimary: boolean;

  /** Date de vérification */
  verifiedAt?: Date;

  /** Méthode de vérification */
  verificationMethod?: 'orcid_oauth' | 'email' | 'manual' | 'imported';
}

// ═══════════════════════════════════════════════════════════════════════════
// MATCHING ET CANDIDATS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Correspondance candidate entre un RawRecord et un AuthorProfile.
 */
interface CandidateMatch {
  id: string;

  /** Référence vers le record brut */
  rawRecordId: string;

  /** Profil auteur potentiel */
  profileId: string;

  /** Type d'entité concernée */
  entityType: 'work_authorship' | 'author_identity';

  /** Score de confiance [0.0, 1.0] */
  matchScore: number;

  /** Raisons du match */
  matchReasons: MatchReason[];

  /** Statut du candidat */
  status: CandidateStatus;

  /** Timestamps */
  createdAt: Date;
  processedAt?: Date;

  /** Détails supplémentaires */
  metadata?: {
    /** Autres profils potentiels pour ce record */
    alternativeProfiles?: string[];

    /** Conflits détectés */
    conflicts?: string[];

    /** Suggestions de l'algorithme */
    suggestions?: string[];
  };
}

type CandidateStatus =
  | 'pending'        // En attente de décision
  | 'confirmed'      // Confirmé par l'auteur
  | 'rejected'       // Rejeté par l'auteur
  | 'uncertain'      // Auteur incertain
  | 'auto_confirmed' // Confirmé automatiquement (haute confiance)
  | 'auto_rejected'  // Rejeté automatiquement (faible confiance)
  | 'merged'         // Fusionné avec un autre candidat
  | 'expired';       // Expiré (source mise à jour)

interface MatchReason {
  type: MatchReasonType;
  weight: number;      // Contribution au score [0.0, 1.0]
  details?: string;
}

type MatchReasonType =
  | 'orcid_exact'           // ORCID identique
  | 'orcid_claimed'         // ORCID revendiqué dans la source
  | 'email_match'           // Email correspondant
  | 'name_exact'            // Nom exact
  | 'name_similar'          // Nom similaire (Levenshtein, phonétique)
  | 'affiliation_match'     // Affiliation correspondante
  | 'affiliation_similar'   // Affiliation similaire
  | 'coauthor_network'      // Réseau de co-auteurs commun
  | 'topic_similarity'      // Similarité thématique
  | 'temporal_consistency'  // Cohérence temporelle
  | 'doi_claimed'           // DOI revendiqué par l'auteur
  | 'previous_decision'     // Décision antérieure similaire
  | 'institutional_link';   // Lien institutionnel

// ═══════════════════════════════════════════════════════════════════════════
// DÉCISIONS DE VÉRIFICATION (AUDIT TRAIL)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Acte de vérification - décision de l'auteur sur un candidat.
 * Immutable, jamais modifié (on crée un nouvel acte pour changer).
 */
interface VerificationAct {
  id: string;

  /** Candidat concerné */
  candidateMatchId: string;

  /** Profil qui a pris la décision */
  profileId: string;

  /** Décision prise */
  decision: VerificationDecision;

  /** Niveau de confiance de l'auteur */
  confidence: AuthorConfidence;

  /** Notes de l'auteur */
  notes?: string;

  /** Preuves fournies */
  evidence: Evidence[];

  /** Metadata */
  decidedAt: Date;
  decidedBy: string;           // userId ou 'system'
  decidedVia: 'web' | 'api' | 'import' | 'auto';

  /** IP et user agent (pour audit) */
  clientInfo?: {
    ip: string;
    userAgent: string;
  };
}

type VerificationDecision =
  | 'confirm'           // "Oui, c'est bien moi"
  | 'reject'            // "Non, ce n'est pas moi"
  | 'uncertain'         // "Je ne sais plus"
  | 'claim_duplicate'   // "C'est le même article qu'un autre"
  | 'claim_version'     // "C'est une version de mon article X"
  | 'claim_error'       // "Il y a une erreur dans les données"
  | 'delegate';         // "Demander à un co-auteur"

type AuthorConfidence =
  | 'certain'           // 100% sûr
  | 'probable'          // Très probable
  | 'possible'          // Possible mais pas sûr
  | 'uncertain';        // Ne sait vraiment pas

interface Evidence {
  type: EvidenceType;
  value: string;
  addedAt: Date;
}

type EvidenceType =
  | 'orcid_link'        // Lien ORCID vers cette publication
  | 'doi_screenshot'    // Capture d'écran
  | 'email_thread'      // Échange email avec éditeur
  | 'coauthor_confirm'  // Confirmation d'un co-auteur
  | 'institutional_cv'  // CV institutionnel
  | 'note';             // Note libre

// ═══════════════════════════════════════════════════════════════════════════
// ŒUVRES CANONIQUES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Publication canonique après réconciliation.
 * Représente une œuvre unique, potentiellement issue de plusieurs DOI/sources.
 */
interface CanonicalWork {
  id: string;

  /** DOI principal (préféré) */
  primaryDoi?: string;

  /** Titre canonique */
  title: string;

  /** Date de publication */
  publicationDate?: Date;

  /** Type de publication */
  type: WorkType;

  /** Venue canonique */
  venueId?: string;

  /** Records bruts fusionnés */
  mergedFrom: MergedSource[];

  /** Statut de la fusion */
  mergeStatus: 'auto' | 'manual' | 'conflict';

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

interface MergedSource {
  rawRecordId: string;
  source: SourceType;
  sourceId: string;
  role: 'primary' | 'version' | 'duplicate' | 'erratum';
  mergedAt: Date;
  mergedBy: string;
}

/**
 * Lien auteur-œuvre vérifié.
 */
interface WorkAuthorship {
  id: string;

  /** Œuvre canonique */
  workId: string;

  /** Profil auteur vérifié */
  profileId: string;

  /** Position dans la liste d'auteurs */
  position: number;

  /** Est auteur correspondant */
  isCorresponding: boolean;

  /** Affiliation au moment de la publication */
  affiliationAtTime?: string;

  /** Acte de vérification qui a créé ce lien */
  verificationActId: string;

  /** Contributions brutes (avant fusion) */
  rawContributions: RawContribution[];

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

interface RawContribution {
  rawRecordId: string;
  authorName: string;
  position: number;
  affiliations?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW & NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tâche de vérification en attente.
 */
interface VerificationTask {
  id: string;
  profileId: string;
  candidateMatchId: string;

  /** Priorité calculée */
  priority: number;

  /** Raison de la priorité */
  priorityReasons: string[];

  /** Date d'expiration */
  expiresAt?: Date;

  /** Rappels envoyés */
  remindersSent: number;
  lastReminderAt?: Date;

  /** Statut */
  status: 'pending' | 'snoozed' | 'completed' | 'expired';

  createdAt: Date;
}

/**
 * Notification utilisateur.
 */
interface Notification {
  id: string;
  profileId: string;

  type: NotificationType;
  title: string;
  body: string;

  /** Lien vers la ressource */
  resourceType?: 'candidate' | 'work' | 'profile';
  resourceId?: string;

  /** Statut */
  read: boolean;
  readAt?: Date;

  createdAt: Date;
}

type NotificationType =
  | 'new_candidate'           // Nouveau candidat détecté
  | 'new_work_version'        // Nouvelle version d'un article
  | 'coauthor_verified'       // Un co-auteur a vérifié
  | 'conflict_detected'       // Conflit avec autre auteur
  | 'reminder'                // Rappel de vérification
  | 'profile_update'          // Mise à jour du profil
  | 'source_sync';            // Synchronisation source terminée
```

---

## États et transitions

### Machine à états des candidats

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MACHINE À ÉTATS - CANDIDATE MATCH                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                           ┌──────────┐                                      │
│                           │  pending │◄─────────────────────────────────┐   │
│                           └────┬─────┘                                  │   │
│                                │                                        │   │
│            ┌───────────────────┼───────────────────┐                    │   │
│            │                   │                   │                    │   │
│            ▼                   ▼                   ▼                    │   │
│    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐              │   │
│    │auto_confirmed│    │  confirmed  │    │  rejected   │              │   │
│    │  (score>0.95)│    │  (manual)   │    │  (manual)   │              │   │
│    └──────┬───────┘    └──────┬──────┘    └──────┬──────┘              │   │
│           │                   │                  │                      │   │
│           │                   │                  │         reopen       │   │
│           │                   │                  └──────────────────────┘   │
│           │                   │                                             │
│           │                   ▼                                             │
│           │            ┌─────────────┐                                      │
│           │            │  uncertain  │──────────────────────────────────┐   │
│           │            │ (manual)    │                                  │   │
│           │            └─────────────┘                                  │   │
│           │                                                             │   │
│           │    ┌─────────────┐           ┌─────────────┐               │   │
│           └───>│   merged    │           │   expired   │◄──────────────┘   │
│                │ (duplicate) │           │(source upd) │                    │
│                └─────────────┘           └─────────────┘                    │
│                                                                              │
│  TRANSITIONS :                                                               │
│  ─────────────                                                               │
│  pending → auto_confirmed : score >= autoConfirmThreshold                   │
│  pending → confirmed : user decision = confirm                              │
│  pending → rejected : user decision = reject                                │
│  pending → uncertain : user decision = uncertain                            │
│  pending → expired : source record updated or deleted                       │
│  confirmed/rejected → pending : user reopens                                │
│  uncertain → confirmed/rejected : user decides later                        │
│  * → merged : duplicate detected and merged                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Interface utilisateur

### Écrans principaux

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ATLAS VERIFY - ÉCRANS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. DASHBOARD                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐               │   │
│  │ │  12 pending   │ │  156 works    │ │  98% verified │               │   │
│  │ │  to review    │ │  confirmed    │ │  completion   │               │   │
│  │ └───────────────┘ └───────────────┘ └───────────────┘               │   │
│  │                                                                      │   │
│  │ Recent Activity                                                      │   │
│  │ ┌──────────────────────────────────────────────────────────────────┐│   │
│  │ │ ✓ "Deep Learning for NLP" confirmed                    2h ago   ││   │
│  │ │ ? "Machine Learning Review" needs attention            1d ago   ││   │
│  │ │ ✗ "Unrelated Paper" rejected                          2d ago   ││   │
│  │ └──────────────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  2. REVIEW QUEUE                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Filter: [All ▼] [High confidence ▼] [This month ▼]                  │   │
│  │                                                                      │   │
│  │ ┌──────────────────────────────────────────────────────────────────┐│   │
│  │ │ 📄 "Attention Is All You Need"                                   ││   │
│  │ │    Vaswani et al. · NeurIPS 2017 · DOI: 10.48550/arXiv.1706.03762││   │
│  │ │    Match: 92% (ORCID claimed, affiliation match)                 ││   │
│  │ │                                                                   ││   │
│  │ │    [✓ C'est moi] [✗ Ce n'est pas moi] [? Je ne sais pas]        ││   │
│  │ │    [⋯ Plus d'options]                                            ││   │
│  │ └──────────────────────────────────────────────────────────────────┘│   │
│  │                                                                      │   │
│  │ ┌──────────────────────────────────────────────────────────────────┐│   │
│  │ │ 📄 "BERT: Pre-training of Deep Bidirectional..."                 ││   │
│  │ │    ...                                                            ││   │
│  │ └──────────────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  3. WORK DETAIL / VERIFICATION                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ "Attention Is All You Need"                                         │   │
│  │                                                                      │   │
│  │ ┌─ Sources ─────────────────────────────────────────────────────────┐│   │
│  │ │ OpenAlex    W2963403868   ✓ DOI match                            ││   │
│  │ │ Crossref    10.48550/...  ✓ Primary                              ││   │
│  │ │ S2          649def...     ✓ ORCID claimed                        ││   │
│  │ │ ArXiv       1706.03762    ⚠ Preprint version                     ││   │
│  │ └───────────────────────────────────────────────────────────────────┘│   │
│  │                                                                      │   │
│  │ ┌─ Your authorship ─────────────────────────────────────────────────┐│   │
│  │ │ Position: 3rd author                                              ││   │
│  │ │ Affiliation: Google Brain (at time of publication)                ││   │
│  │ │ Corresponding: No                                                 ││   │
│  │ └───────────────────────────────────────────────────────────────────┘│   │
│  │                                                                      │   │
│  │ ┌─ Decision ────────────────────────────────────────────────────────┐│   │
│  │ │                                                                   ││   │
│  │ │ ○ Oui, c'est bien mon article                                    ││   │
│  │ │   ○ Je suis certain                                              ││   │
│  │ │   ○ Je pense que oui                                             ││   │
│  │ │                                                                   ││   │
│  │ │ ○ Non, ce n'est pas mon article                                  ││   │
│  │ │   └─ Il y a un homonyme ? [Suggérer un autre auteur]             ││   │
│  │ │                                                                   ││   │
│  │ │ ○ Je ne suis pas sûr(e)                                          ││   │
│  │ │   └─ Pourquoi ? [_______________________________]                ││   │
│  │ │                                                                   ││   │
│  │ │ ○ C'est un doublon de... [Sélectionner l'original]               ││   │
│  │ │                                                                   ││   │
│  │ │ ○ C'est une version de... [preprint → publié]                    ││   │
│  │ │                                                                   ││   │
│  │ │ Notes (optionnel): [________________________________]            ││   │
│  │ │                                                                   ││   │
│  │ │                              [Annuler] [Enregistrer ma décision]  ││   │
│  │ └───────────────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  4. PROFILE MANAGEMENT                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ┌─ Identities ──────────────────────────────────────────────────────┐│   │
│  │ │ ORCID       0000-0002-1825-0097  ✓ Primary  [Unlink]             ││   │
│  │ │ Email       marie.curie@univ.fr  ✓ Verified [Change]             ││   │
│  │ │ OpenAlex    A5012345678          Linked     [Unlink]             ││   │
│  │ │ HAL         marie-curie          Linked     [Unlink]             ││   │
│  │ │                                                                   ││   │
│  │ │ [+ Ajouter une identité]                                         ││   │
│  │ └───────────────────────────────────────────────────────────────────┘│   │
│  │                                                                      │   │
│  │ ┌─ Name variants ───────────────────────────────────────────────────┐│   │
│  │ │ Marie Curie           Primary                                    ││   │
│  │ │ M. Curie              Also me                                    ││   │
│  │ │ Marie Sklodowska      Maiden name                                ││   │
│  │ │ Maria Sklodowska      Polish spelling                            ││   │
│  │ │                                                                   ││   │
│  │ │ [+ Ajouter une variante]                                         ││   │
│  │ └───────────────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture technique

### Stack applicative

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ATLAS VERIFY - STACK TECHNIQUE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FRONTEND                                                                    │
│  ─────────                                                                   │
│  Framework     : SvelteKit 2 (Svelte 5 runes)                               │
│  UI            : Tailwind CSS + shadcn-svelte                               │
│  State         : Svelte stores + TanStack Query                             │
│  Auth          : ORCID OAuth 2.0 + session cookies                          │
│                                                                              │
│  BACKEND                                                                     │
│  ─────────                                                                   │
│  Runtime       : Node.js 20+ / Bun                                          │
│  Framework     : Hono + Effect                                              │
│  API           : REST + Server-Sent Events (real-time)                      │
│  Auth          : ORCID OAuth, JWT sessions                                  │
│  Jobs          : BullMQ (Redis-backed)                                      │
│                                                                              │
│  DATA LAYER                                                                  │
│  ──────────                                                                  │
│  Primary DB    : PostgreSQL 16 (JSONB, GIN indexes)                         │
│  Search        : Meilisearch ou Elasticsearch                               │
│  Cache         : Redis (sessions, rate limits, job queue)                   │
│  Object Store  : S3/MinIO (evidence files)                                  │
│                                                                              │
│  INFRASTRUCTURE                                                              │
│  ──────────────                                                              │
│  Orchestration : Kubernetes (k3s)                                           │
│  Ingress       : Traefik / Cilium                                           │
│  Observability : Prometheus + Grafana + Loki                                │
│  CI/CD         : GitHub Actions + ArgoCD                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Services Kubernetes

```yaml
# Namespace et services
apiVersion: v1
kind: Namespace
metadata:
  name: atlas-verify

---
# Déploiements principaux
# 1. Frontend (SvelteKit SSR)
# 2. API Backend (Hono)
# 3. Worker (jobs asynchrones)
# 4. Ingestion (sync sources)

# Voir section "Infrastructure Kubernetes" pour les manifests complets
```

---

## API REST

### Endpoints principaux

```yaml
openapi: '3.1.0'
info:
  title: Atlas Verify API
  version: '1.0.0'

paths:
  # ═══════════════════════════════════════════════════════════════════════
  # AUTHENTICATION
  # ═══════════════════════════════════════════════════════════════════════

  /auth/orcid:
    get:
      summary: Initier OAuth ORCID
      description: Redirige vers ORCID pour authentification

  /auth/orcid/callback:
    get:
      summary: Callback OAuth ORCID
      description: Reçoit le code OAuth et crée la session

  /auth/logout:
    post:
      summary: Déconnexion

  # ═══════════════════════════════════════════════════════════════════════
  # PROFILE
  # ═══════════════════════════════════════════════════════════════════════

  /profile:
    get:
      summary: Profil de l'utilisateur connecté
    patch:
      summary: Mettre à jour le profil

  /profile/identities:
    get:
      summary: Lister les identités liées
    post:
      summary: Ajouter une identité
    delete:
      summary: Supprimer une identité

  /profile/settings:
    get:
      summary: Paramètres utilisateur
    patch:
      summary: Mettre à jour les paramètres

  # ═══════════════════════════════════════════════════════════════════════
  # CANDIDATES (VERIFICATION QUEUE)
  # ═══════════════════════════════════════════════════════════════════════

  /candidates:
    get:
      summary: Liste des candidats à vérifier
      parameters:
        - name: status
          in: query
          schema:
            type: array
            items:
              enum: [pending, uncertain]
        - name: minScore
          in: query
          schema:
            type: number
        - name: source
          in: query
          schema:
            $ref: '#/components/schemas/SourceType'
        - name: sort
          in: query
          schema:
            enum: [score_desc, date_desc, priority_desc]
        - name: page
          in: query
          schema:
            type: integer
        - name: perPage
          in: query
          schema:
            type: integer

  /candidates/{id}:
    get:
      summary: Détail d'un candidat

  /candidates/{id}/verify:
    post:
      summary: Enregistrer une décision de vérification
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [decision]
              properties:
                decision:
                  $ref: '#/components/schemas/VerificationDecision'
                confidence:
                  $ref: '#/components/schemas/AuthorConfidence'
                notes:
                  type: string
                evidence:
                  type: array
                  items:
                    $ref: '#/components/schemas/Evidence'
                relatedWorkId:
                  type: string
                  description: Pour claim_duplicate ou claim_version

  /candidates/{id}/snooze:
    post:
      summary: Reporter la vérification
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                until:
                  type: string
                  format: date-time

  # ═══════════════════════════════════════════════════════════════════════
  # WORKS (VERIFIED)
  # ═══════════════════════════════════════════════════════════════════════

  /works:
    get:
      summary: Publications vérifiées de l'utilisateur
      parameters:
        - name: year
          in: query
          schema:
            type: integer
        - name: type
          in: query
          schema:
            $ref: '#/components/schemas/WorkType'
        - name: search
          in: query
          schema:
            type: string

  /works/{id}:
    get:
      summary: Détail d'une publication vérifiée

  /works/{id}/sources:
    get:
      summary: Sources brutes liées à cette publication

  /works/{id}/merge:
    post:
      summary: Fusionner avec une autre publication (doublons)
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [targetWorkId, role]
              properties:
                targetWorkId:
                  type: string
                role:
                  enum: [duplicate, version, erratum]

  /works/{id}/unlink:
    post:
      summary: Retirer la publication de son profil

  # ═══════════════════════════════════════════════════════════════════════
  # STATS & EXPORT
  # ═══════════════════════════════════════════════════════════════════════

  /stats:
    get:
      summary: Statistiques du profil
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  worksCount:
                    type: integer
                  pendingCount:
                    type: integer
                  verificationRate:
                    type: number
                  citationCount:
                    type: integer
                  byYear:
                    type: object
                  byType:
                    type: object

  /export:
    get:
      summary: Exporter les publications
      parameters:
        - name: format
          in: query
          schema:
            enum: [bibtex, ris, json, csv]

  # ═══════════════════════════════════════════════════════════════════════
  # NOTIFICATIONS
  # ═══════════════════════════════════════════════════════════════════════

  /notifications:
    get:
      summary: Liste des notifications

  /notifications/{id}/read:
    post:
      summary: Marquer comme lue

  /notifications/read-all:
    post:
      summary: Marquer toutes comme lues

components:
  schemas:
    VerificationDecision:
      type: string
      enum:
        - confirm
        - reject
        - uncertain
        - claim_duplicate
        - claim_version
        - claim_error
        - delegate

    AuthorConfidence:
      type: string
      enum:
        - certain
        - probable
        - possible
        - uncertain
```

---

## Algorithme de matching

### Score de confiance

```typescript
interface MatchingConfig {
  weights: {
    orcid_exact: 1.0;        // ORCID identique = match certain
    orcid_claimed: 0.95;     // ORCID revendiqué dans la source
    email_match: 0.9;        // Email correspondant
    name_exact: 0.6;         // Nom exact
    name_similar: 0.3;       // Nom similaire (Levenshtein > 0.8)
    affiliation_match: 0.4;  // Affiliation exacte
    affiliation_similar: 0.2;// Affiliation similaire
    coauthor_network: 0.3;   // Co-auteurs communs
    topic_similarity: 0.2;   // Sujets similaires
    temporal_consistency: 0.1;// Dates cohérentes
  };

  thresholds: {
    autoConfirm: 0.95;       // Auto-confirmation
    suggest: 0.5;            // Suggestion à l'utilisateur
    autoReject: 0.1;         // Rejet automatique
  };
}

const calculateMatchScore = (
  rawRecord: RawRecord,
  profile: AuthorProfile,
  config: MatchingConfig
): { score: number; reasons: MatchReason[] } => {
  const reasons: MatchReason[] = [];
  let totalWeight = 0;
  let weightedScore = 0;

  // 1. ORCID (déterminant)
  const recordOrcid = extractOrcid(rawRecord);
  if (recordOrcid) {
    const profileOrcids = getProfileOrcids(profile);
    if (profileOrcids.includes(recordOrcid)) {
      // ORCID exact = match quasi-certain
      if (rawRecord.data.orcidClaimedInSource) {
        reasons.push({ type: 'orcid_claimed', weight: config.weights.orcid_claimed });
        return { score: config.weights.orcid_claimed, reasons };
      }
      reasons.push({ type: 'orcid_exact', weight: config.weights.orcid_exact });
      return { score: config.weights.orcid_exact, reasons };
    }
  }

  // 2. Email
  const recordEmails = extractEmails(rawRecord);
  const profileEmails = getProfileEmails(profile);
  const emailMatch = recordEmails.some(e => profileEmails.includes(e.toLowerCase()));
  if (emailMatch) {
    reasons.push({ type: 'email_match', weight: config.weights.email_match });
    weightedScore += config.weights.email_match;
    totalWeight += 1;
  }

  // 3. Nom
  const recordNames = extractAuthorNames(rawRecord);
  const profileNames = getProfileNameVariants(profile);
  for (const recordName of recordNames) {
    const nameScore = findBestNameMatch(recordName, profileNames);
    if (nameScore.exact) {
      reasons.push({ type: 'name_exact', weight: config.weights.name_exact, details: recordName });
      weightedScore += config.weights.name_exact;
      totalWeight += 1;
      break;
    } else if (nameScore.similarity > 0.8) {
      reasons.push({
        type: 'name_similar',
        weight: config.weights.name_similar * nameScore.similarity,
        details: `${recordName} ≈ ${nameScore.matchedName}`
      });
      weightedScore += config.weights.name_similar * nameScore.similarity;
      totalWeight += 1;
      break;
    }
  }

  // 4. Affiliation
  const recordAffiliations = extractAffiliations(rawRecord);
  const profileAffiliations = getProfileAffiliations(profile);
  const affiliationScore = matchAffiliations(recordAffiliations, profileAffiliations);
  if (affiliationScore.exact) {
    reasons.push({ type: 'affiliation_match', weight: config.weights.affiliation_match });
    weightedScore += config.weights.affiliation_match;
    totalWeight += 1;
  } else if (affiliationScore.similarity > 0.7) {
    reasons.push({ type: 'affiliation_similar', weight: config.weights.affiliation_similar });
    weightedScore += config.weights.affiliation_similar;
    totalWeight += 1;
  }

  // 5. Réseau de co-auteurs
  const coauthorScore = calculateCoauthorNetworkScore(rawRecord, profile);
  if (coauthorScore > 0) {
    reasons.push({
      type: 'coauthor_network',
      weight: config.weights.coauthor_network * coauthorScore,
      details: `${Math.round(coauthorScore * 100)}% co-authors match`
    });
    weightedScore += config.weights.coauthor_network * coauthorScore;
    totalWeight += 1;
  }

  // 6. Similarité thématique
  const topicScore = calculateTopicSimilarity(rawRecord, profile);
  if (topicScore > 0.5) {
    reasons.push({
      type: 'topic_similarity',
      weight: config.weights.topic_similarity * topicScore
    });
    weightedScore += config.weights.topic_similarity * topicScore;
    totalWeight += 1;
  }

  // Score final normalisé
  const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

  return { score: Math.min(finalScore, 1.0), reasons };
};
```

---

## Workflows de synchronisation

### Import initial

```typescript
const initialImportWorkflow = Effect.gen(function* () {
  const profile = yield* getCurrentProfile();

  // 1. Collecter les identités du profil
  const identities = yield* getProfileIdentities(profile.id);

  // 2. Interroger chaque source avec les identités
  const sourceQueries = identities.flatMap(identity =>
    SOURCES.map(source => ({
      source,
      query: buildQueryForIdentity(source, identity)
    }))
  );

  // 3. Fetch parallèle avec rate limiting
  const rawRecords = yield* Effect.forEach(
    sourceQueries,
    ({ source, query }) => fetchFromSource(source, query),
    { concurrency: 5 }
  ).pipe(Effect.map(results => results.flat()));

  // 4. Déduplication par checksum
  const uniqueRecords = deduplicateByChecksum(rawRecords);

  // 5. Stocker les records bruts
  yield* storeRawRecords(uniqueRecords);

  // 6. Générer les candidats
  const candidates = yield* generateCandidates(uniqueRecords, profile);

  // 7. Auto-confirmer les hautes confiances
  const { autoConfirmed, pending } = partitionByConfidence(
    candidates,
    profile.settings.autoConfirmThreshold
  );

  yield* autoConfirmCandidates(autoConfirmed);
  yield* createVerificationTasks(pending);

  // 8. Notifier l'utilisateur
  yield* sendNotification(profile.id, {
    type: 'source_sync',
    title: 'Import terminé',
    body: `${uniqueRecords.length} publications trouvées, ${pending.length} à vérifier`
  });
});
```

### Synchronisation périodique

```typescript
// Job BullMQ exécuté quotidiennement
const periodicSyncJob = Effect.gen(function* () {
  const activeProfiles = yield* getActiveProfiles();

  for (const profile of activeProfiles) {
    // 1. Dernière sync
    const lastSync = yield* getLastSyncTime(profile.id);

    // 2. Fetch incrémental depuis lastSync
    const newRecords = yield* fetchIncrementalUpdates(profile, lastSync);

    if (newRecords.length === 0) continue;

    // 3. Stocker et générer candidats
    yield* storeRawRecords(newRecords);
    const candidates = yield* generateCandidates(newRecords, profile);

    // 4. Vérifier si des records existants ont changé
    const updates = yield* detectRecordUpdates(profile.id, newRecords);

    // 5. Marquer les candidats expirés
    yield* expireUpdatedCandidates(updates);

    // 6. Notification si nouvelles publications
    if (candidates.length > 0) {
      yield* sendNotification(profile.id, {
        type: 'new_candidate',
        title: `${candidates.length} nouvelles publications détectées`,
        body: 'Cliquez pour vérifier'
      });
    }
  }
});
```

---

Maintenant, je vais créer la documentation sur l'analyse des bases de données.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Concevoir le mod\u00e8le de donn\u00e9es pour la fiabilisation", "status": "completed", "activeForm": "Designing data model for verification"}, {"content": "D\u00e9finir l'architecture de l'application de fiabilisation", "status": "completed", "activeForm": "Defining verification app architecture"}, {"content": "Analyser les bases de donn\u00e9es adapt\u00e9es (Kubernetes)", "status": "in_progress", "activeForm": "Analyzing suitable databases for Kubernetes"}, {"content": "Documenter les workflows de fiabilisation", "status": "completed", "activeForm": "Documenting verification workflows"}]