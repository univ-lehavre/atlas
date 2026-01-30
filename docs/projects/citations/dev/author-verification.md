# Author Verification System (Atlas Verify)

This document describes the system that allows authors to verify their aggregated bibliographic data from different sources.

> **See also:**
> - [Researcher Profile](./researcher-profile.md) - Career reconstruction, expertise, collaborations
> - [Databases](./database-analysis.md) - PostgreSQL, MongoDB analysis and storage choices
> - [Advanced Databases & Search](./advanced-databases.md) - ArangoDB, vector search, multi-database federation
> - [Unified Schema](./unified-schema.md) - Work, Author entity specification, etc.
>
> **User documentation:** [Verify Your Publications](../user/verify-publications.md) - Guide for researchers

## Problem Statement

Bibliographic sources present recurring quality issues:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA QUALITY ISSUES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  HOMONYMY                            FRAGMENTATION                           │
│  ─────────                           ─────────────                           │
│  "Jean Martin" = 15k+ different      Same author with:                       │
│  authors in OpenAlex                 - 3 different ORCIDs                    │
│                                      - "J. Martin", "Jean Martin", "J-P Martin"│
│                                      - Inconsistent affiliations             │
│                                                                              │
│  INCORRECT ATTRIBUTION               MISSING DATA                            │
│  ─────────────────────               ─────────────                           │
│  Article attributed to the wrong     - DOI absent                            │
│  "Jean Martin" by the                - ORCID not linked                      │
│  disambiguation algorithm            - Unknown affiliation                   │
│                                      - Approximate date                      │
│                                                                              │
│  DUPLICATES                          MULTIPLE VERSIONS                       │
│  ──────────                          ─────────────────                       │
│  Same article with 3 DOIs:           - ArXiv preprint                        │
│  - Publisher DOI                     - Accepted version                      │
│  - Crossref DOI                      - Published version                     │
│  - DataCite DOI (data)               - Erratum                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## System Overview

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

## Data Model

### Fundamental Principles

1. **Raw data immutability**: Imported data is never modified
2. **Complete traceability**: Each decision is timestamped and attributed
3. **Versioning**: Complete state history
4. **Data/decision separation**: User assertions are stored separately

### Conceptual Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA MODEL                                      │
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

### TypeScript Definitions

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// RAW DATA (IMMUTABLE)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Raw record imported from a source.
 * NEVER modified after creation.
 */
interface RawRecord {
  /** UUID v7 (time-sortable) */
  id: string;

  /** Origin source */
  source: SourceType;

  /** Identifier in source (DOI, OpenAlex ID, etc.) */
  sourceId: string;

  /** Entity type */
  entityType: 'work' | 'author' | 'institution';

  /** Complete raw data (JSONB) */
  data: unknown;

  /** Import timestamp */
  fetchedAt: Date;

  /** SHA-256 of data for deduplication */
  checksum: string;

  /** Source API version at fetch time */
  sourceApiVersion?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTHOR PROFILES (VERIFIED)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verified author profile managed by the user.
 */
interface AuthorProfile {
  /** UUID v7 */
  id: string;

  /** Primary ORCID (source of truth for identity) */
  primaryOrcid?: string;

  /** Preferred display name */
  displayName: string;

  /** Institutional email (for authentication) */
  email?: string;

  /** Current primary institution */
  institutionId?: string;

  /** Avatar URL */
  avatarUrl?: string;

  /** Short bio */
  bio?: string;

  /** User settings */
  settings: AuthorSettings;

  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

interface AuthorSettings {
  /** Email notifications */
  emailNotifications: boolean;

  /** Notification frequency */
  notificationFrequency: 'immediate' | 'daily' | 'weekly';

  /** Sources to monitor */
  watchedSources: SourceType[];

  /** Auto-confirm high-confidence matches */
  autoConfirmThreshold?: number;  // 0.0 - 1.0, null = disabled

  /** Profile visibility */
  visibility: 'public' | 'institution' | 'private';
}

/**
 * Identity associated with the profile (ORCID, email, OpenAlex ID, etc.)
 */
interface ProfileIdentity {
  id: string;
  profileId: string;

  /** Identifier type */
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

  /** Identifier value */
  identifierValue: string;

  /** Is primary identifier of this type? */
  isPrimary: boolean;

  /** Verification date */
  verifiedAt?: Date;

  /** Verification method */
  verificationMethod?: 'orcid_oauth' | 'email' | 'manual' | 'imported';
}

// ═══════════════════════════════════════════════════════════════════════════
// MATCHING AND CANDIDATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Candidate match between a RawRecord and an AuthorProfile.
 */
interface CandidateMatch {
  id: string;

  /** Reference to raw record */
  rawRecordId: string;

  /** Potential author profile */
  profileId: string;

  /** Concerned entity type */
  entityType: 'work_authorship' | 'author_identity';

  /** Confidence score [0.0, 1.0] */
  matchScore: number;

  /** Match reasons */
  matchReasons: MatchReason[];

  /** Candidate status */
  status: CandidateStatus;

  /** Timestamps */
  createdAt: Date;
  processedAt?: Date;

  /** Additional details */
  metadata?: {
    /** Other potential profiles for this record */
    alternativeProfiles?: string[];

    /** Detected conflicts */
    conflicts?: string[];

    /** Algorithm suggestions */
    suggestions?: string[];
  };
}

type CandidateStatus =
  | 'pending'        // Awaiting decision
  | 'confirmed'      // Confirmed by author
  | 'rejected'       // Rejected by author
  | 'uncertain'      // Author uncertain
  | 'auto_confirmed' // Automatically confirmed (high confidence)
  | 'auto_rejected'  // Automatically rejected (low confidence)
  | 'merged'         // Merged with another candidate
  | 'expired';       // Expired (source updated)

interface MatchReason {
  type: MatchReasonType;
  weight: number;      // Contribution to score [0.0, 1.0]
  details?: string;
}

type MatchReasonType =
  | 'orcid_exact'           // Identical ORCID
  | 'orcid_claimed'         // ORCID claimed in source
  | 'email_match'           // Matching email
  | 'name_exact'            // Exact name
  | 'name_similar'          // Similar name (Levenshtein, phonetic)
  | 'affiliation_match'     // Matching affiliation
  | 'affiliation_similar'   // Similar affiliation
  | 'coauthor_network'      // Common co-author network
  | 'topic_similarity'      // Thematic similarity
  | 'temporal_consistency'  // Temporal consistency
  | 'doi_claimed'           // DOI claimed by author
  | 'previous_decision'     // Similar previous decision
  | 'institutional_link';   // Institutional link

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION DECISIONS (AUDIT TRAIL)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verification act - author's decision on a candidate.
 * Immutable, never modified (a new act is created to change).
 */
interface VerificationAct {
  id: string;

  /** Concerned candidate */
  candidateMatchId: string;

  /** Profile that made the decision */
  profileId: string;

  /** Decision made */
  decision: VerificationDecision;

  /** Author's confidence level */
  confidence: AuthorConfidence;

  /** Author notes */
  notes?: string;

  /** Provided evidence */
  evidence: Evidence[];

  /** Metadata */
  decidedAt: Date;
  decidedBy: string;           // userId or 'system'
  decidedVia: 'web' | 'api' | 'import' | 'auto';

  /** IP and user agent (for audit) */
  clientInfo?: {
    ip: string;
    userAgent: string;
  };
}

type VerificationDecision =
  | 'confirm'           // "Yes, this is me"
  | 'reject'            // "No, this is not me"
  | 'uncertain'         // "I don't remember"
  | 'claim_duplicate'   // "This is the same article as another"
  | 'claim_version'     // "This is a version of my article X"
  | 'claim_error'       // "There is an error in the data"
  | 'delegate';         // "Ask a co-author"

type AuthorConfidence =
  | 'certain'           // 100% sure
  | 'probable'          // Very likely
  | 'possible'          // Possible but not sure
  | 'uncertain';        // Really doesn't know

interface Evidence {
  type: EvidenceType;
  value: string;
  addedAt: Date;
}

type EvidenceType =
  | 'orcid_link'        // ORCID link to this publication
  | 'doi_screenshot'    // Screenshot
  | 'email_thread'      // Email exchange with publisher
  | 'coauthor_confirm'  // Co-author confirmation
  | 'institutional_cv'  // Institutional CV
  | 'note';             // Free note

// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL WORKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Canonical publication after reconciliation.
 * Represents a unique work, potentially from multiple DOIs/sources.
 */
interface CanonicalWork {
  id: string;

  /** Primary DOI (preferred) */
  primaryDoi?: string;

  /** Canonical title */
  title: string;

  /** Publication date */
  publicationDate?: Date;

  /** Publication type */
  type: WorkType;

  /** Canonical venue */
  venueId?: string;

  /** Merged raw records */
  mergedFrom: MergedSource[];

  /** Merge status */
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
 * Verified author-work link.
 */
interface WorkAuthorship {
  id: string;

  /** Canonical work */
  workId: string;

  /** Verified author profile */
  profileId: string;

  /** Position in author list */
  position: number;

  /** Is corresponding author */
  isCorresponding: boolean;

  /** Affiliation at publication time */
  affiliationAtTime?: string;

  /** Verification act that created this link */
  verificationActId: string;

  /** Raw contributions (before merge) */
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
 * Pending verification task.
 */
interface VerificationTask {
  id: string;
  profileId: string;
  candidateMatchId: string;

  /** Calculated priority */
  priority: number;

  /** Priority reasons */
  priorityReasons: string[];

  /** Expiration date */
  expiresAt?: Date;

  /** Reminders sent */
  remindersSent: number;
  lastReminderAt?: Date;

  /** Status */
  status: 'pending' | 'snoozed' | 'completed' | 'expired';

  createdAt: Date;
}

/**
 * User notification.
 */
interface Notification {
  id: string;
  profileId: string;

  type: NotificationType;
  title: string;
  body: string;

  /** Link to resource */
  resourceType?: 'candidate' | 'work' | 'profile';
  resourceId?: string;

  /** Status */
  read: boolean;
  readAt?: Date;

  createdAt: Date;
}

type NotificationType =
  | 'new_candidate'           // New candidate detected
  | 'new_work_version'        // New version of an article
  | 'coauthor_verified'       // A co-author verified
  | 'conflict_detected'       // Conflict with another author
  | 'reminder'                // Verification reminder
  | 'profile_update'          // Profile update
  | 'source_sync';            // Source synchronization completed
```

---

## States and Transitions

### Candidate State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STATE MACHINE - CANDIDATE MATCH                         │
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
│  TRANSITIONS:                                                                │
│  ────────────                                                                │
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

## User Interface

### Main Screens

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ATLAS VERIFY - SCREENS                              │
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
│  │ │    [✓ This is me] [✗ Not me] [? I'm not sure]                   ││   │
│  │ │    [⋯ More options]                                              ││   │
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
│  │ │ ○ Yes, this is my article                                        ││   │
│  │ │   ○ I am certain                                                  ││   │
│  │ │   ○ I think so                                                    ││   │
│  │ │                                                                   ││   │
│  │ │ ○ No, this is not my article                                     ││   │
│  │ │   └─ Is there a homonym? [Suggest another author]                ││   │
│  │ │                                                                   ││   │
│  │ │ ○ I'm not sure                                                   ││   │
│  │ │   └─ Why? [_______________________________]                      ││   │
│  │ │                                                                   ││   │
│  │ │ ○ This is a duplicate of... [Select original]                    ││   │
│  │ │                                                                   ││   │
│  │ │ ○ This is a version of... [preprint → published]                 ││   │
│  │ │                                                                   ││   │
│  │ │ Notes (optional): [________________________________]              ││   │
│  │ │                                                                   ││   │
│  │ │                                   [Cancel] [Save my decision]    ││   │
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
│  │ │ [+ Add an identity]                                              ││   │
│  │ └───────────────────────────────────────────────────────────────────┘│   │
│  │                                                                      │   │
│  │ ┌─ Name variants ───────────────────────────────────────────────────┐│   │
│  │ │ Marie Curie           Primary                                    ││   │
│  │ │ M. Curie              Also me                                    ││   │
│  │ │ Marie Sklodowska      Maiden name                                ││   │
│  │ │ Maria Sklodowska      Polish spelling                            ││   │
│  │ │                                                                   ││   │
│  │ │ [+ Add a variant]                                                ││   │
│  │ └───────────────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Application Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ATLAS VERIFY - TECHNICAL STACK                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FRONTEND                                                                    │
│  ────────                                                                    │
│  Framework     : SvelteKit 2 (Svelte 5 runes)                               │
│  UI            : Tailwind CSS + shadcn-svelte                               │
│  State         : Svelte stores + TanStack Query                             │
│  Auth          : ORCID OAuth 2.0 + session cookies                          │
│                                                                              │
│  BACKEND                                                                     │
│  ───────                                                                     │
│  Runtime       : Node.js 20+ / Bun                                          │
│  Framework     : Hono + Effect                                              │
│  API           : REST + Server-Sent Events (real-time)                      │
│  Auth          : ORCID OAuth, JWT sessions                                  │
│  Jobs          : BullMQ (Redis-backed)                                      │
│                                                                              │
│  DATA LAYER                                                                  │
│  ──────────                                                                  │
│  Primary DB    : PostgreSQL 16 (JSONB, GIN indexes)                         │
│  Search        : Meilisearch or Elasticsearch                               │
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

### Kubernetes Services

```yaml
# Namespace and services
apiVersion: v1
kind: Namespace
metadata:
  name: atlas-verify

---
# Main deployments
# 1. Frontend (SvelteKit SSR)
# 2. API Backend (Hono)
# 3. Worker (async jobs)
# 4. Ingestion (source sync)

# See "Kubernetes Infrastructure" section for complete manifests
```

---

## REST API

### Main Endpoints

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
      summary: Initiate ORCID OAuth
      description: Redirects to ORCID for authentication

  /auth/orcid/callback:
    get:
      summary: ORCID OAuth callback
      description: Receives OAuth code and creates session

  /auth/logout:
    post:
      summary: Logout

  # ═══════════════════════════════════════════════════════════════════════
  # PROFILE
  # ═══════════════════════════════════════════════════════════════════════

  /profile:
    get:
      summary: Current user's profile
    patch:
      summary: Update profile

  /profile/identities:
    get:
      summary: List linked identities
    post:
      summary: Add an identity
    delete:
      summary: Remove an identity

  /profile/settings:
    get:
      summary: User settings
    patch:
      summary: Update settings

  # ═══════════════════════════════════════════════════════════════════════
  # CANDIDATES (VERIFICATION QUEUE)
  # ═══════════════════════════════════════════════════════════════════════

  /candidates:
    get:
      summary: List candidates to verify
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
      summary: Candidate detail

  /candidates/{id}/verify:
    post:
      summary: Record a verification decision
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
                  description: For claim_duplicate or claim_version

  /candidates/{id}/snooze:
    post:
      summary: Postpone verification
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
      summary: User's verified publications
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
      summary: Verified publication detail

  /works/{id}/sources:
    get:
      summary: Raw sources linked to this publication

  /works/{id}/merge:
    post:
      summary: Merge with another publication (duplicates)
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
      summary: Remove publication from profile

  # ═══════════════════════════════════════════════════════════════════════
  # STATS & EXPORT
  # ═══════════════════════════════════════════════════════════════════════

  /stats:
    get:
      summary: Profile statistics
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
      summary: Export publications
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
      summary: List notifications

  /notifications/{id}/read:
    post:
      summary: Mark as read

  /notifications/read-all:
    post:
      summary: Mark all as read

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

## Matching Algorithm

### Confidence Score

```typescript
interface MatchingConfig {
  weights: {
    orcid_exact: 1.0;        // Identical ORCID = certain match
    orcid_claimed: 0.95;     // ORCID claimed in source
    email_match: 0.9;        // Matching email
    name_exact: 0.6;         // Exact name
    name_similar: 0.3;       // Similar name (Levenshtein > 0.8)
    affiliation_match: 0.4;  // Exact affiliation
    affiliation_similar: 0.2;// Similar affiliation
    coauthor_network: 0.3;   // Common co-authors
    topic_similarity: 0.2;   // Similar topics
    temporal_consistency: 0.1;// Consistent dates
  };

  thresholds: {
    autoConfirm: 0.95;       // Auto-confirmation
    suggest: 0.5;            // Suggest to user
    autoReject: 0.1;         // Auto-rejection
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

  // 1. ORCID (determinant)
  const recordOrcid = extractOrcid(rawRecord);
  if (recordOrcid) {
    const profileOrcids = getProfileOrcids(profile);
    if (profileOrcids.includes(recordOrcid)) {
      // Exact ORCID = quasi-certain match
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

  // 3. Name
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

  // 5. Co-author network
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

  // 6. Topic similarity
  const topicScore = calculateTopicSimilarity(rawRecord, profile);
  if (topicScore > 0.5) {
    reasons.push({
      type: 'topic_similarity',
      weight: config.weights.topic_similarity * topicScore
    });
    weightedScore += config.weights.topic_similarity * topicScore;
    totalWeight += 1;
  }

  // Final normalized score
  const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

  return { score: Math.min(finalScore, 1.0), reasons };
};
```

---

## Synchronization Workflows

### Initial Import

```typescript
const initialImportWorkflow = Effect.gen(function* () {
  const profile = yield* getCurrentProfile();

  // 1. Collect profile identities
  const identities = yield* getProfileIdentities(profile.id);

  // 2. Query each source with identities
  const sourceQueries = identities.flatMap(identity =>
    SOURCES.map(source => ({
      source,
      query: buildQueryForIdentity(source, identity)
    }))
  );

  // 3. Parallel fetch with rate limiting
  const rawRecords = yield* Effect.forEach(
    sourceQueries,
    ({ source, query }) => fetchFromSource(source, query),
    { concurrency: 5 }
  ).pipe(Effect.map(results => results.flat()));

  // 4. Deduplication by checksum
  const uniqueRecords = deduplicateByChecksum(rawRecords);

  // 5. Store raw records
  yield* storeRawRecords(uniqueRecords);

  // 6. Generate candidates
  const candidates = yield* generateCandidates(uniqueRecords, profile);

  // 7. Auto-confirm high confidence
  const { autoConfirmed, pending } = partitionByConfidence(
    candidates,
    profile.settings.autoConfirmThreshold
  );

  yield* autoConfirmCandidates(autoConfirmed);
  yield* createVerificationTasks(pending);

  // 8. Notify user
  yield* sendNotification(profile.id, {
    type: 'source_sync',
    title: 'Import completed',
    body: `${uniqueRecords.length} publications found, ${pending.length} to verify`
  });
});
```

### Periodic Synchronization

```typescript
// BullMQ job executed daily
const periodicSyncJob = Effect.gen(function* () {
  const activeProfiles = yield* getActiveProfiles();

  for (const profile of activeProfiles) {
    // 1. Last sync
    const lastSync = yield* getLastSyncTime(profile.id);

    // 2. Incremental fetch since lastSync
    const newRecords = yield* fetchIncrementalUpdates(profile, lastSync);

    if (newRecords.length === 0) continue;

    // 3. Store and generate candidates
    yield* storeRawRecords(newRecords);
    const candidates = yield* generateCandidates(newRecords, profile);

    // 4. Check if existing records have changed
    const updates = yield* detectRecordUpdates(profile.id, newRecords);

    // 5. Mark expired candidates
    yield* expireUpdatedCandidates(updates);

    // 6. Notification if new publications
    if (candidates.length > 0) {
      yield* sendNotification(profile.id, {
        type: 'new_candidate',
        title: `${candidates.length} new publications detected`,
        body: 'Click to verify'
      });
    }
  }
});
```
