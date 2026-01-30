# Unified atlas-citations Schema

This document defines the unified schema for `@univ-lehavre/atlas-citations`, the common denominator between all bibliographic sources, and the complete OpenAPI specification.

> **See also:**
> - [Unified Client](./citations-client.md) - Using the aggregator client
> - [Source Catalog](./sources/catalog.md) - Detail of each bibliographic source
> - [Entity Reference](./sources/entities-reference.md) - Entities by source
>
> **User documentation:** [Data Sources](../user/sources.md) - Guide for researchers

## Common Denominator Analysis

### Methodology

To build a relevant unified schema, we analyzed entities and fields from 15+ bibliographic sources. The retained schema maximizes:

1. **Coverage**: fields present in the majority of sources
2. **Utility**: fields frequently used in practice
3. **Interoperability**: identifiers enabling cross-source linking

### Field Availability Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           FIELD AVAILABILITY MATRIX                                              │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  WORK FIELD            │ OA │ CR │ HAL│ ArX│ ORC│ S2 │ PM │ EPM│ DC │ ZEN│ DBL│ BRX│ COR│ UNIF │
│  ──────────────────────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼──────│
│  title               │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅   │
│  doi                 │ ✅ │ ✅ │ ✅ │ ⚠️ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅   │
│  authors             │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅   │
│  publicationDate     │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅   │
│  abstract            │ ✅ │ ⚠️ │ ✅ │ ✅ │ ❌ │ ✅ │ ✅ │ ✅ │ ⚠️ │ ✅ │ ❌ │ ✅ │ ✅ │ ✅   │
│  venue/journal       │ ✅ │ ✅ │ ✅ │ ⚠️ │ ✅ │ ✅ │ ✅ │ ✅ │ ⚠️ │ ✅ │ ✅ │ ⚠️ │ ✅ │ ✅   │
│  citationCount       │ ✅ │ ✅ │ ❌ │ ❌ │ ❌ │ ✅ │ ❌ │ ✅ │ ✅ │ ❌ │ ❌ │ ❌ │ ✅ │ ⚠️   │
│  isOpenAccess        │ ✅ │ ⚠️ │ ✅ │ ✅ │ ❌ │ ✅ │ ⚠️ │ ✅ │ ❌ │ ✅ │ ❌ │ ✅ │ ✅ │ ✅   │
│  pdfUrl              │ ✅ │ ⚠️ │ ✅ │ ✅ │ ❌ │ ✅ │ ⚠️ │ ✅ │ ⚠️ │ ✅ │ ⚠️ │ ✅ │ ✅ │ ✅   │
│  license             │ ✅ │ ✅ │ ✅ │ ✅ │ ❌ │ ⚠️ │ ⚠️ │ ✅ │ ✅ │ ✅ │ ❌ │ ✅ │ ✅ │ ✅   │
│  keywords            │ ✅ │ ⚠️ │ ✅ │ ✅ │ ❌ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ❌ │ ✅ │ ⚠️ │ ✅   │
│  type                │ ✅ │ ✅ │ ✅ │ ⚠️ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅ │ ✅   │
│  language            │ ✅ │ ✅ │ ✅ │ ❌ │ ❌ │ ❌ │ ✅ │ ✅ │ ✅ │ ✅ │ ❌ │ ❌ │ ✅ │ ⚠️   │
│  funders             │ ✅ │ ✅ │ ✅ │ ❌ │ ❌ │ ❌ │ ✅ │ ✅ │ ✅ │ ✅ │ ❌ │ ✅ │ ❌ │ ⚠️   │
│  references          │ ✅ │ ✅ │ ⚠️ │ ❌ │ ❌ │ ✅ │ ✅ │ ✅ │ ⚠️ │ ⚠️ │ ❌ │ ❌ │ ✅ │ ⚠️   │
│  fullText            │ ❌ │ ❌ │ ⚠️ │ ❌ │ ❌ │ ❌ │ ⚠️ │ ✅ │ ❌ │ ✅ │ ❌ │ ⚠️ │ ✅ │ ⚠️   │
│                                                                                                 │
│  ✅ = Available   ⚠️ = Partial/Optional   ❌ = Not available                                   │
│                                                                                                 │
│  OA=OpenAlex, CR=Crossref, HAL, ArX=ArXiv, ORC=ORCID, S2=SemanticScholar,                      │
│  PM=PubMed, EPM=EuropePMC, DC=DataCite, ZEN=Zenodo, DBL=DBLP, BRX=bioRxiv, COR=CORE           │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Fields Retained for Unified Schema

| Category | Fields | Justification |
|----------|--------|---------------|
| **Identifiers** | `id`, `externalIds` | Required for cross-source linking |
| **Core** | `title`, `authors`, `publicationDate`, `type` | Present in 100% of sources |
| **Content** | `abstract`, `keywords` | Present in 80%+ of sources |
| **Publication** | `venue`, `volume`, `issue`, `pages` | Essential for citations |
| **Metrics** | `citationCount` | Present in 60%+ of sources |
| **Open Access** | `isOpenAccess`, `openAccessStatus`, `pdfUrl`, `license` | Critical for access |
| **Relations** | `references`, `funders` | Present in 50%+ of sources |
| **Metadata** | `language`, `source`, `updatedAt` | Context and traceability |
| **Raw** | `_raw` | Complete source data for advanced use cases |

---

## Detailed Unified Schema

### Main Entities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ATLAS-CITATIONS ENTITIES                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │     Work     │───>│    Author    │<───│  Institution │                   │
│  │ (Publication)│    │ (Researcher) │    │(Organization)│                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                   │                   │                            │
│         │                   │                   │                            │
│         ▼                   ▼                   ▼                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │    Venue     │    │  Affiliation │    │    Funder    │                   │
│  │(Journal/Conf)│    │  (Position)  │    │  (Funder)    │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Work (Publication)

The central entity of the unified schema.

```typescript
interface Work {
  // ═══════════════════════════════════════════════════════════════
  // IDENTIFIERS
  // ═══════════════════════════════════════════════════════════════

  /** Unique identifier in atlas-citations (prefixed by source) */
  id: string;                          // "openalex:W2741809807"

  /** Source of origin */
  source: SourceType;                  // "openalex" | "crossref" | ...

  /** Known external identifiers */
  externalIds: {
    doi?: string;                      // "10.1038/nature12373"
    openalex?: string;                 // "W2741809807"
    crossref?: string;                 // Same as DOI
    hal?: string;                      // "hal-01234567"
    arxiv?: string;                    // "2301.12345"
    pmid?: string;                     // "12345678"
    pmcid?: string;                    // "PMC1234567"
    s2?: string;                       // Semantic Scholar ID
    dblp?: string;                     // "journals/nature/Smith23"
    core?: string;                     // CORE ID
    zenodo?: string;                   // "1234567"
    datacite?: string;                 // DataCite DOI
  };

  // ═══════════════════════════════════════════════════════════════
  // BIBLIOGRAPHIC METADATA (Core)
  // ═══════════════════════════════════════════════════════════════

  /** Publication title */
  title: string;

  /** Author list */
  authors: WorkAuthor[];

  /** Publication date (ISO 8601) */
  publicationDate?: string;            // "2023-06-15"

  /** Publication year */
  year?: number;                       // 2023

  /** Normalized publication type */
  type: WorkType;

  /** Original type from source */
  originalType?: string;               // "journal-article", "Article", etc.

  // ═══════════════════════════════════════════════════════════════
  // CONTENT
  // ═══════════════════════════════════════════════════════════════

  /** Abstract */
  abstract?: string;

  /** Keywords (normalized) */
  keywords?: string[];

  /** Research fields */
  fieldsOfStudy?: string[];

  /** Language (ISO 639-1) */
  language?: string;                   // "en", "fr"

  // ═══════════════════════════════════════════════════════════════
  // PUBLICATION (Venue)
  // ═══════════════════════════════════════════════════════════════

  /** Publication venue */
  venue?: Venue;

  /** Volume */
  volume?: string;

  /** Issue */
  issue?: string;

  /** Pages */
  pages?: string;                      // "123-145"

  /** Publisher */
  publisher?: string;

  // ═══════════════════════════════════════════════════════════════
  // METRICS
  // ═══════════════════════════════════════════════════════════════

  /** Citation count */
  citationCount?: number;

  /** Reference count */
  referenceCount?: number;

  /** Influential citations (Semantic Scholar) */
  influentialCitationCount?: number;

  // ═══════════════════════════════════════════════════════════════
  // OPEN ACCESS
  // ═══════════════════════════════════════════════════════════════

  /** Open Access status */
  openAccess?: {
    /** Is Open Access? */
    isOa: boolean;

    /** Normalized OA status */
    status: OpenAccessStatus;          // "gold" | "green" | "hybrid" | "bronze" | "closed"

    /** Direct PDF URL (if available) */
    pdfUrl?: string;

    /** OA landing page URL */
    oaUrl?: string;

    /** License */
    license?: string;                  // "cc-by", "cc-by-nc", etc.

    /** OA version */
    version?: OaVersion;               // "published" | "accepted" | "submitted"

    /** All OA locations */
    locations?: OaLocation[];
  };

  // ═══════════════════════════════════════════════════════════════
  // RELATIONS
  // ═══════════════════════════════════════════════════════════════

  /** Cited references */
  references?: WorkReference[];

  /** Funding */
  funders?: Funder[];

  /** Related identifiers (datasets, code, etc.) */
  relatedIdentifiers?: RelatedIdentifier[];

  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════

  /** Last update date in atlas-citations */
  updatedAt: string;

  /** Raw data from original source */
  _raw: unknown;
}

// ═══════════════════════════════════════════════════════════════════
// ENUMERATED TYPES
// ═══════════════════════════════════════════════════════════════════

type SourceType =
  | 'openalex'
  | 'crossref'
  | 'hal'
  | 'arxiv'
  | 'orcid'
  | 'semanticscholar'
  | 'pubmed'
  | 'europepmc'
  | 'datacite'
  | 'zenodo'
  | 'doaj'
  | 'dblp'
  | 'biorxiv'
  | 'medrxiv'
  | 'core'
  | 'unpaywall'
  | 'opencitations';

type WorkType =
  | 'article'           // Journal article
  | 'preprint'          // Preprint
  | 'conference-paper'  // Conference paper
  | 'book'              // Book
  | 'book-chapter'      // Book chapter
  | 'thesis'            // Thesis
  | 'dissertation'      // Dissertation
  | 'report'            // Technical report
  | 'dataset'           // Dataset
  | 'software'          // Software
  | 'review'            // Review article
  | 'editorial'         // Editorial
  | 'letter'            // Letter/Correspondence
  | 'erratum'           // Erratum
  | 'other';            // Other

type OpenAccessStatus =
  | 'gold'              // OA at publisher (OA journal)
  | 'green'             // OA in repository
  | 'hybrid'            // OA in hybrid journal
  | 'bronze'            // Free to read (no license)
  | 'diamond'           // OA without APC
  | 'closed';           // Closed access

type OaVersion =
  | 'published'         // Publisher version
  | 'accepted'          // Accepted manuscript (AAM)
  | 'submitted';        // Submitted preprint
```

### WorkAuthor (Publication Author)

```typescript
interface WorkAuthor {
  /** Position in author list */
  position: number;

  /** Display name */
  displayName: string;

  /** First name (if separated) */
  firstName?: string;

  /** Last name (if separated) */
  lastName?: string;

  /** ORCID */
  orcid?: string;

  /** Identifiers by source */
  externalIds?: {
    openalex?: string;
    hal?: string;
    s2?: string;
    dblp?: string;
  };

  /** Affiliations at publication time */
  affiliations?: WorkAffiliation[];

  /** Is corresponding author? */
  isCorresponding?: boolean;
}

interface WorkAffiliation {
  /** Institution name */
  name: string;

  /** ROR ID */
  ror?: string;

  /** Country (ISO 3166-1 alpha-2) */
  country?: string;
}
```

### Author (Author Profile)

```typescript
interface Author {
  /** Unique atlas-citations identifier */
  id: string;                          // "orcid:0000-0002-1825-0097"

  /** Source of origin */
  source: SourceType;

  /** External identifiers */
  externalIds: {
    orcid?: string;
    openalex?: string;
    hal?: string;
    s2?: string;
    dblp?: string;
    scopus?: string;
  };

  /** Display name */
  displayName: string;

  /** Alternative names / aliases */
  alternativeNames?: string[];

  /** Current affiliations */
  affiliations?: Affiliation[];

  /** Metrics */
  metrics?: {
    worksCount?: number;
    citationCount?: number;
    hIndex?: number;
    i10Index?: number;
  };

  /** Profile URL */
  profileUrl?: string;

  /** Personal homepage */
  homepage?: string;

  /** Last update */
  updatedAt: string;

  /** Raw data */
  _raw: unknown;
}

interface Affiliation {
  /** Institution */
  institution: Institution;

  /** Dates (if known) */
  startYear?: number;
  endYear?: number;

  /** Role */
  role?: string;
}
```

### Institution (Organization)

```typescript
interface Institution {
  /** Unique atlas-citations identifier */
  id: string;                          // "ror:03yrm5c26"

  /** Source of origin */
  source: SourceType;

  /** External identifiers */
  externalIds: {
    ror?: string;                      // "03yrm5c26"
    openalex?: string;                 // "I27837315"
    grid?: string;                     // Obsolete but present
    isni?: string;
    wikidata?: string;
    fundref?: string;
  };

  /** Official name */
  name: string;

  /** Alternative names */
  alternativeNames?: string[];

  /** Acronym */
  acronym?: string;

  /** Type */
  type?: InstitutionType;

  /** Location */
  location?: {
    city?: string;
    region?: string;
    country: string;                   // ISO 3166-1 alpha-2
    countryName?: string;
  };

  /** Website URL */
  homepage?: string;

  /** Metrics */
  metrics?: {
    worksCount?: number;
    citationCount?: number;
  };

  /** Last update */
  updatedAt: string;

  /** Raw data */
  _raw: unknown;
}

type InstitutionType =
  | 'education'         // University, school
  | 'healthcare'        // Hospital, medical center
  | 'company'           // Company
  | 'government'        // Government, ministry
  | 'nonprofit'         // NGO, association
  | 'facility'          // Research infrastructure
  | 'archive'           // Archive, library
  | 'other';
```

### Venue (Journal/Conference)

```typescript
interface Venue {
  /** Unique atlas-citations identifier */
  id: string;

  /** Source of origin */
  source: SourceType;

  /** External identifiers */
  externalIds: {
    openalex?: string;
    issn?: string;                     // ISSN-L or first ISSN
    issns?: string[];                  // All ISSNs
    issnL?: string;
    eissn?: string;
    pissn?: string;
    doaj?: string;
  };

  /** Name */
  name: string;

  /** Abbreviated name */
  abbreviation?: string;

  /** Type */
  type: VenueType;

  /** Publisher */
  publisher?: string;

  /** Is Open Access? */
  isOa?: boolean;

  /** URL */
  homepage?: string;

  /** Last update */
  updatedAt: string;

  /** Raw data */
  _raw: unknown;
}

type VenueType =
  | 'journal'
  | 'conference'
  | 'repository'
  | 'book-series'
  | 'other';
```

### Funder

```typescript
interface Funder {
  /** Unique atlas-citations identifier */
  id: string;

  /** Source of origin */
  source: SourceType;

  /** External identifiers */
  externalIds: {
    openalex?: string;
    crossref?: string;                 // Funder Registry ID
    ror?: string;
    fundref?: string;
    doi?: string;
  };

  /** Name */
  name: string;

  /** Country */
  country?: string;

  /** Grant/award number */
  awardId?: string;

  /** Raw data */
  _raw: unknown;
}
```

### Auxiliary Types

```typescript
interface WorkReference {
  /** Reference DOI */
  doi?: string;

  /** Known identifiers */
  externalIds?: {
    doi?: string;
    openalex?: string;
    pmid?: string;
  };

  /** Position in reference list */
  position?: number;

  /** Raw reference text (if DOI unknown) */
  rawText?: string;
}

interface OaLocation {
  /** Resource URL */
  url: string;

  /** Direct PDF URL */
  pdfUrl?: string;

  /** Host type */
  hostType: 'publisher' | 'repository';

  /** License */
  license?: string;

  /** Version */
  version?: OaVersion;

  /** Repository name (if repository) */
  repositoryName?: string;
}

interface RelatedIdentifier {
  /** Identifier */
  id: string;

  /** Identifier type */
  idType: 'doi' | 'url' | 'arxiv' | 'pmid' | 'handle';

  /** Relation type */
  relationType:
    | 'cites'
    | 'is-cited-by'
    | 'supplements'
    | 'is-supplemented-by'
    | 'references'
    | 'is-referenced-by'
    | 'documents'
    | 'is-documented-by'
    | 'compiles'
    | 'is-compiled-by'
    | 'is-variant-of'
    | 'is-original-of'
    | 'is-version-of'
    | 'has-version'
    | 'is-part-of'
    | 'has-part'
    | 'is-derived-from'
    | 'is-source-of';
}
```

---

## Source to Unified Schema Mapping

### Work: Correspondence Table

| Unified Field | OpenAlex | Crossref | HAL | ArXiv | Semantic Scholar | PubMed |
|---------------|----------|----------|-----|-------|------------------|--------|
| `id` | `id` | `DOI` | `docid` | `id` | `paperId` | `PMID` |
| `title` | `title` | `title[0]` | `title_s` | `title` | `title` | `ArticleTitle` |
| `doi` | `doi` | `DOI` | `doiId_s` | - | `externalIds.DOI` | `ELocationID[doi]` |
| `authors[].displayName` | `authorships[].author.display_name` | `author[].given + family` | `authFullName_s` | `authors[].name` | `authors[].name` | `AuthorList[].ForeName + LastName` |
| `authors[].orcid` | `authorships[].author.orcid` | `author[].ORCID` | `authOrcidIdExt_s` | - | `authors[].externalIds.ORCID` | `AuthorList[].Identifier[Source=ORCID]` |
| `publicationDate` | `publication_date` | `published.date-parts` | `publicationDate_s` | `published` | `publicationDate` | `PubDate` |
| `year` | `publication_year` | `published.date-parts[0][0]` | `publicationDateY_i` | - | `year` | `PubDate/Year` |
| `type` | `type` | `type` | `docType_s` | - | `publicationTypes[0]` | `PublicationType` |
| `abstract` | `abstract` | `abstract` | `abstract_s` | `summary` | `abstract` | `Abstract/AbstractText` |
| `keywords` | `keywords[].keyword` | - | `keyword_s` | `categories` | `fieldsOfStudy` | `KeywordList` |
| `venue.name` | `primary_location.source.display_name` | `container-title[0]` | `journalTitle_s` | - | `venue` | `Journal/Title` |
| `venue.issn` | `primary_location.source.issn_l` | `ISSN[0]` | `journalIdExt_s` | - | `publicationVenue.issn` | `Journal/ISSN` |
| `volume` | `biblio.volume` | `volume` | `volume_s` | - | `journal.volume` | `Volume` |
| `issue` | `biblio.issue` | `issue` | `issue_s` | - | - | `Issue` |
| `pages` | `biblio.first_page-last_page` | `page` | `page_s` | - | `journal.pages` | `Pagination` |
| `publisher` | `primary_location.source.host_organization_name` | `publisher` | `publisher_s` | - | - | `Publisher` |
| `citationCount` | `cited_by_count` | `is-referenced-by-count` | - | - | `citationCount` | - |
| `referenceCount` | `referenced_works_count` | `reference-count` | - | - | `referenceCount` | - |
| `openAccess.isOa` | `open_access.is_oa` | - | `openAccess_bool` | `true` | `isOpenAccess` | - |
| `openAccess.status` | `open_access.oa_status` | - | - | `"green"` | - | - |
| `openAccess.pdfUrl` | `open_access.oa_url` | - | `fileMain_s` | `links[rel=pdf].href` | `openAccessPdf.url` | `pmc/pdf` |
| `openAccess.license` | `primary_location.license` | `license[0].URL` | `licence_s` | - | - | - |
| `language` | `language` | `language` | `language_s` | - | - | `Language` |
| `funders` | `grants[].funder` | `funder` | `anrProjectId_s` | - | - | `GrantList` |
| `references` | `referenced_works` | `reference` | - | - | `references` | `ReferenceList` |

### Type Normalization

```typescript
const normalizeWorkType = (source: SourceType, originalType: string): WorkType => {
  const mapping: Record<string, Record<string, WorkType>> = {
    openalex: {
      'article': 'article',
      'book': 'book',
      'book-chapter': 'book-chapter',
      'dataset': 'dataset',
      'dissertation': 'thesis',
      'editorial': 'editorial',
      'erratum': 'erratum',
      'letter': 'letter',
      'paratext': 'other',
      'peer-review': 'review',
      'preprint': 'preprint',
      'report': 'report',
      'review': 'review',
      'standard': 'other',
    },
    crossref: {
      'journal-article': 'article',
      'posted-content': 'preprint',
      'proceedings-article': 'conference-paper',
      'book': 'book',
      'book-chapter': 'book-chapter',
      'dissertation': 'thesis',
      'dataset': 'dataset',
      'report': 'report',
      'monograph': 'book',
      'edited-book': 'book',
      'reference-entry': 'other',
    },
    hal: {
      'ART': 'article',
      'COMM': 'conference-paper',
      'POSTER': 'conference-paper',
      'OUV': 'book',
      'COUV': 'book-chapter',
      'THESE': 'thesis',
      'HDR': 'thesis',
      'MEM': 'dissertation',
      'REPORT': 'report',
      'PRESCONF': 'conference-paper',
      'OTHER': 'other',
      'UNDEFINED': 'other',
    },
    arxiv: {
      // ArXiv = always preprint
      'default': 'preprint',
    },
    semanticscholar: {
      'JournalArticle': 'article',
      'Conference': 'conference-paper',
      'Review': 'review',
      'Book': 'book',
      'BookSection': 'book-chapter',
      'Dataset': 'dataset',
      'Patent': 'other',
      'Repository': 'preprint',
    },
  };

  return mapping[source]?.[originalType] ?? 'other';
};
```

### Open Access Status Normalization

```typescript
const normalizeOaStatus = (
  source: SourceType,
  data: unknown
): OpenAccessStatus => {
  switch (source) {
    case 'openalex':
      return data.open_access?.oa_status ?? 'closed';

    case 'crossref':
      // Crossref has no direct OA field
      // Infer from license or use Unpaywall
      if (data.license?.some(l => l.URL?.includes('creativecommons'))) {
        return 'hybrid';
      }
      return 'closed';

    case 'hal':
      return data.openAccess_bool ? 'green' : 'closed';

    case 'arxiv':
      return 'green'; // ArXiv = always green OA

    case 'biorxiv':
    case 'medrxiv':
      return 'green'; // Preprint servers = green

    case 'doaj':
      return 'gold'; // DOAJ = always gold

    case 'zenodo':
      return data.metadata?.access_right === 'open' ? 'green' : 'closed';

    default:
      return 'closed';
  }
};
```

---

## Complete OpenAPI Specification

The complete OpenAPI spec for atlas-citations is available at `packages/citations/specs/citations.yaml`.

```yaml
openapi: '3.1.0'
info:
  title: Atlas Citations API
  version: '1.0.0'
  description: |
    Unified API for querying multiple bibliographic sources.

    Transparently aggregates:
    - **Priority 1**: OpenAlex, Crossref, HAL, ArXiv, ORCID
    - **Priority 2**: Semantic Scholar, PubMed, Unpaywall, OpenCitations
    - **Priority 3**: Europe PMC, DataCite, DOAJ, Zenodo, CORE
    - **Specialized**: DBLP, bioRxiv/medRxiv

    ## Source Selection

    By default, the client automatically selects the most relevant sources
    based on the identifier or query. You can force specific sources via
    the `sources` parameter.

    ## Rate limiting

    Each source has its own limits. The API automatically handles backoff
    and exposes quotas via `/health/rate-limits`.
  contact:
    name: Universite Le Havre Normandie
    url: https://github.com/univ-lehavre/atlas
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: '{baseUrl}'
    description: atlas-citations server
    variables:
      baseUrl:
        default: 'http://localhost:3000'
        description: Server base URL

tags:
  - name: Works
    description: Scientific publications
  - name: Authors
    description: Author profiles
  - name: Institutions
    description: Organizations and affiliations
  - name: Venues
    description: Journals and conferences
  - name: Funders
    description: Research funders
  - name: Resolve
    description: Universal identifier resolution
  - name: Health
    description: Monitoring and rate limits

paths:
  # ════════════════════════════════════════════════════════════════════
  # WORKS
  # ════════════════════════════════════════════════════════════════════

  /works:
    get:
      operationId: searchWorks
      summary: Search publications
      tags: [Works]
      parameters:
        - $ref: '#/components/parameters/query'
        - $ref: '#/components/parameters/sources'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
        - name: filter
          in: query
          description: |
            Field filters. Format: `field:value` or `field:op:value`.
            Examples:
            - `year:2023`
            - `year:gte:2020`
            - `type:article`
            - `openAccess.isOa:true`
            - `venue.issn:1234-5678`
          schema:
            type: array
            items:
              type: string
          style: form
          explode: true
        - name: sort
          in: query
          description: |
            Result sorting. Format: `field:direction`.
            Examples: `citationCount:desc`, `publicationDate:asc`
          schema:
            type: string
            default: 'relevance:desc'
        - name: fields
          in: query
          description: |
            Fields to include in response (projection).
            By default, all standard fields are included.
            Use `_raw` to include raw data.
          schema:
            type: array
            items:
              type: string
          style: form
          explode: false
      responses:
        '200':
          description: Search results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorksResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '429':
          $ref: '#/components/responses/RateLimited'

  /works/{id}:
    get:
      operationId: getWork
      summary: Get a publication by identifier
      tags: [Works]
      parameters:
        - name: id
          in: path
          required: true
          description: |
            Publication identifier. Supported formats:
            - DOI: `10.1038/nature12373`
            - OpenAlex: `W2741809807` or `openalex:W2741809807`
            - HAL: `hal-01234567`
            - ArXiv: `2301.12345` or `arxiv:2301.12345`
            - PMID: `pmid:12345678`
            - Semantic Scholar: `s2:abc123...`
          schema:
            type: string
          examples:
            doi:
              value: '10.1038/nature12373'
              summary: DOI
            openalex:
              value: 'W2741809807'
              summary: OpenAlex ID
            hal:
              value: 'hal-01234567'
              summary: HAL ID
            arxiv:
              value: '2301.12345'
              summary: ArXiv ID
        - $ref: '#/components/parameters/sources'
        - name: fields
          in: query
          schema:
            type: array
            items:
              type: string
      responses:
        '200':
          description: Publication found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Work'
        '404':
          $ref: '#/components/responses/NotFound'
        '429':
          $ref: '#/components/responses/RateLimited'

  /works/{id}/references:
    get:
      operationId: getWorkReferences
      summary: Get references of a publication
      tags: [Works]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
      responses:
        '200':
          description: Publication references
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorksResponse'

  /works/{id}/citations:
    get:
      operationId: getWorkCitations
      summary: Get citations of a publication
      tags: [Works]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
      responses:
        '200':
          description: Articles citing this publication
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorksResponse'

  # ════════════════════════════════════════════════════════════════════
  # AUTHORS
  # ════════════════════════════════════════════════════════════════════

  /authors:
    get:
      operationId: searchAuthors
      summary: Search authors
      tags: [Authors]
      parameters:
        - $ref: '#/components/parameters/query'
        - $ref: '#/components/parameters/sources'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
        - name: filter
          in: query
          schema:
            type: array
            items:
              type: string
      responses:
        '200':
          description: Search results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthorsResponse'

  /authors/{id}:
    get:
      operationId: getAuthor
      summary: Get an author by identifier
      tags: [Authors]
      parameters:
        - name: id
          in: path
          required: true
          description: |
            Author identifier:
            - ORCID: `0000-0002-1825-0097`
            - OpenAlex: `A5023888391`
            - HAL: `hal-00001`
            - Semantic Scholar: `s2:1741101`
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
      responses:
        '200':
          description: Author found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Author'
        '404':
          $ref: '#/components/responses/NotFound'

  /authors/{id}/works:
    get:
      operationId: getAuthorWorks
      summary: Publications by an author
      tags: [Authors]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
        - name: sort
          in: query
          schema:
            type: string
            default: 'publicationDate:desc'
      responses:
        '200':
          description: Author's publications
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorksResponse'

  # ════════════════════════════════════════════════════════════════════
  # INSTITUTIONS
  # ════════════════════════════════════════════════════════════════════

  /institutions:
    get:
      operationId: searchInstitutions
      summary: Search institutions
      tags: [Institutions]
      parameters:
        - $ref: '#/components/parameters/query'
        - $ref: '#/components/parameters/sources'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
        - name: filter
          in: query
          schema:
            type: array
            items:
              type: string
      responses:
        '200':
          description: Search results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InstitutionsResponse'

  /institutions/{id}:
    get:
      operationId: getInstitution
      summary: Get an institution by identifier
      tags: [Institutions]
      parameters:
        - name: id
          in: path
          required: true
          description: |
            Institution identifier:
            - ROR: `03yrm5c26`
            - OpenAlex: `I27837315`
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
      responses:
        '200':
          description: Institution found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Institution'

  /institutions/{id}/works:
    get:
      operationId: getInstitutionWorks
      summary: Publications by an institution
      tags: [Institutions]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
      responses:
        '200':
          description: Institution's publications
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorksResponse'

  /institutions/{id}/authors:
    get:
      operationId: getInstitutionAuthors
      summary: Authors at an institution
      tags: [Institutions]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
      responses:
        '200':
          description: Authors affiliated with the institution
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthorsResponse'

  # ════════════════════════════════════════════════════════════════════
  # VENUES
  # ════════════════════════════════════════════════════════════════════

  /venues:
    get:
      operationId: searchVenues
      summary: Search venues (journals, conferences)
      tags: [Venues]
      parameters:
        - $ref: '#/components/parameters/query'
        - $ref: '#/components/parameters/sources'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
      responses:
        '200':
          description: Search results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VenuesResponse'

  /venues/{id}:
    get:
      operationId: getVenue
      summary: Get a venue by identifier
      tags: [Venues]
      parameters:
        - name: id
          in: path
          required: true
          description: ISSN, OpenAlex ID, or DOAJ ID
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
      responses:
        '200':
          description: Venue found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Venue'

  # ════════════════════════════════════════════════════════════════════
  # FUNDERS
  # ════════════════════════════════════════════════════════════════════

  /funders:
    get:
      operationId: searchFunders
      summary: Search funders
      tags: [Funders]
      parameters:
        - $ref: '#/components/parameters/query'
        - $ref: '#/components/parameters/sources'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
      responses:
        '200':
          description: Search results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FundersResponse'

  /funders/{id}:
    get:
      operationId: getFunder
      summary: Get a funder by identifier
      tags: [Funders]
      parameters:
        - name: id
          in: path
          required: true
          description: OpenAlex ID, Crossref Funder ID, or ROR
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
      responses:
        '200':
          description: Funder found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Funder'

  /funders/{id}/works:
    get:
      operationId: getFunderWorks
      summary: Funded publications
      tags: [Funders]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
      responses:
        '200':
          description: Funded publications
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorksResponse'

  # ════════════════════════════════════════════════════════════════════
  # RESOLVE
  # ════════════════════════════════════════════════════════════════════

  /resolve/{id}:
    get:
      operationId: resolve
      summary: Resolve an identifier
      description: |
        Automatically detects the identifier type and returns the
        corresponding entity.

        **Supported identifiers:**
        - DOI: `10.1038/nature12373` -> Work
        - ORCID: `0000-0002-1825-0097` -> Author
        - ROR: `03yrm5c26` -> Institution
        - ISSN: `1234-5678` -> Venue
        - OpenAlex: `W...` | `A...` | `I...` | `S...` | `F...`
        - HAL: `hal-...` -> Work
        - ArXiv: `1234.56789` -> Work
        - PMID: `12345678` -> Work
      tags: [Resolve]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
      responses:
        '200':
          description: Resolved entity
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/Work'
                  - $ref: '#/components/schemas/Author'
                  - $ref: '#/components/schemas/Institution'
                  - $ref: '#/components/schemas/Venue'
                  - $ref: '#/components/schemas/Funder'
                discriminator:
                  propertyName: _type
        '404':
          $ref: '#/components/responses/NotFound'

  # ════════════════════════════════════════════════════════════════════
  # HEALTH
  # ════════════════════════════════════════════════════════════════════

  /health:
    get:
      operationId: getHealth
      summary: Service health status
      tags: [Health]
      responses:
        '200':
          description: Service status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'

  /health/rate-limits:
    get:
      operationId: getRateLimits
      summary: Quotas by source
      tags: [Health]
      responses:
        '200':
          description: Quota status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RateLimitsResponse'

  /health/sources:
    get:
      operationId: getSourcesHealth
      summary: Health status by source
      tags: [Health]
      responses:
        '200':
          description: Source status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SourcesHealthResponse'

# ════════════════════════════════════════════════════════════════════════
# COMPONENTS
# ════════════════════════════════════════════════════════════════════════

components:
  # ──────────────────────────────────────────────────────────────────────
  # PARAMETERS
  # ──────────────────────────────────────────────────────────────────────

  parameters:
    query:
      name: q
      in: query
      description: Search term
      schema:
        type: string
      example: 'machine learning'

    sources:
      name: sources
      in: query
      description: |
        Sources to query. If omitted, intelligent automatic selection.
      schema:
        type: array
        items:
          $ref: '#/components/schemas/SourceType'
      style: form
      explode: false
      example: ['openalex', 'crossref']

    page:
      name: page
      in: query
      description: Page number (1-indexed)
      schema:
        type: integer
        minimum: 1
        default: 1

    perPage:
      name: per_page
      in: query
      description: Results per page (max 100)
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 25

  # ──────────────────────────────────────────────────────────────────────
  # RESPONSES
  # ──────────────────────────────────────────────────────────────────────

  responses:
    BadRequest:
      description: Invalid request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    RateLimited:
      description: Quota exceeded
      headers:
        Retry-After:
          description: Seconds before retry
          schema:
            type: integer
        X-RateLimit-Source:
          description: Source that reached its limit
          schema:
            type: string
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/RateLimitError'

  # ──────────────────────────────────────────────────────────────────────
  # SCHEMAS
  # ──────────────────────────────────────────────────────────────────────

  schemas:
    # ═══════════════════════════════════════════════════════════════════
    # ENUMS
    # ═══════════════════════════════════════════════════════════════════

    SourceType:
      type: string
      enum:
        - openalex
        - crossref
        - hal
        - arxiv
        - orcid
        - semanticscholar
        - pubmed
        - europepmc
        - datacite
        - zenodo
        - doaj
        - dblp
        - biorxiv
        - medrxiv
        - core
        - unpaywall
        - opencitations
      description: Bibliographic source

    WorkType:
      type: string
      enum:
        - article
        - preprint
        - conference-paper
        - book
        - book-chapter
        - thesis
        - dissertation
        - report
        - dataset
        - software
        - review
        - editorial
        - letter
        - erratum
        - other
      description: Publication type

    OpenAccessStatus:
      type: string
      enum:
        - gold
        - green
        - hybrid
        - bronze
        - diamond
        - closed
      description: Open Access status

    OaVersion:
      type: string
      enum:
        - published
        - accepted
        - submitted
      description: OA manuscript version

    InstitutionType:
      type: string
      enum:
        - education
        - healthcare
        - company
        - government
        - nonprofit
        - facility
        - archive
        - other

    VenueType:
      type: string
      enum:
        - journal
        - conference
        - repository
        - book-series
        - other

    # ═══════════════════════════════════════════════════════════════════
    # ENTITIES
    # ═══════════════════════════════════════════════════════════════════

    Work:
      type: object
      required:
        - id
        - source
        - title
        - type
        - updatedAt
      properties:
        _type:
          type: string
          const: 'work'
        id:
          type: string
          description: Unique atlas-citations identifier
          example: 'openalex:W2741809807'
        source:
          $ref: '#/components/schemas/SourceType'
        externalIds:
          $ref: '#/components/schemas/ExternalIds'
        title:
          type: string
        authors:
          type: array
          items:
            $ref: '#/components/schemas/WorkAuthor'
        publicationDate:
          type: string
          format: date
        year:
          type: integer
        type:
          $ref: '#/components/schemas/WorkType'
        originalType:
          type: string
          description: Original type from source
        abstract:
          type: string
        keywords:
          type: array
          items:
            type: string
        fieldsOfStudy:
          type: array
          items:
            type: string
        language:
          type: string
          description: ISO 639-1 code
        venue:
          $ref: '#/components/schemas/VenueRef'
        volume:
          type: string
        issue:
          type: string
        pages:
          type: string
        publisher:
          type: string
        citationCount:
          type: integer
        referenceCount:
          type: integer
        influentialCitationCount:
          type: integer
        openAccess:
          $ref: '#/components/schemas/OpenAccess'
        references:
          type: array
          items:
            $ref: '#/components/schemas/WorkReference'
        funders:
          type: array
          items:
            $ref: '#/components/schemas/FunderRef'
        relatedIdentifiers:
          type: array
          items:
            $ref: '#/components/schemas/RelatedIdentifier'
        updatedAt:
          type: string
          format: date-time
        _raw:
          type: object
          description: Raw data from source

    WorkAuthor:
      type: object
      required:
        - position
        - displayName
      properties:
        position:
          type: integer
        displayName:
          type: string
        firstName:
          type: string
        lastName:
          type: string
        orcid:
          type: string
          pattern: '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$'
        externalIds:
          type: object
          properties:
            openalex:
              type: string
            hal:
              type: string
            s2:
              type: string
            dblp:
              type: string
        affiliations:
          type: array
          items:
            $ref: '#/components/schemas/WorkAffiliation'
        isCorresponding:
          type: boolean

    WorkAffiliation:
      type: object
      required:
        - name
      properties:
        name:
          type: string
        ror:
          type: string
        country:
          type: string
          description: ISO 3166-1 alpha-2 code

    Author:
      type: object
      required:
        - id
        - source
        - displayName
        - updatedAt
      properties:
        _type:
          type: string
          const: 'author'
        id:
          type: string
          example: 'orcid:0000-0002-1825-0097'
        source:
          $ref: '#/components/schemas/SourceType'
        externalIds:
          $ref: '#/components/schemas/ExternalIds'
        displayName:
          type: string
        alternativeNames:
          type: array
          items:
            type: string
        affiliations:
          type: array
          items:
            $ref: '#/components/schemas/Affiliation'
        metrics:
          type: object
          properties:
            worksCount:
              type: integer
            citationCount:
              type: integer
            hIndex:
              type: integer
            i10Index:
              type: integer
        profileUrl:
          type: string
          format: uri
        homepage:
          type: string
          format: uri
        updatedAt:
          type: string
          format: date-time
        _raw:
          type: object

    Affiliation:
      type: object
      required:
        - institution
      properties:
        institution:
          $ref: '#/components/schemas/InstitutionRef'
        startYear:
          type: integer
        endYear:
          type: integer
        role:
          type: string

    Institution:
      type: object
      required:
        - id
        - source
        - name
        - updatedAt
      properties:
        _type:
          type: string
          const: 'institution'
        id:
          type: string
          example: 'ror:03yrm5c26'
        source:
          $ref: '#/components/schemas/SourceType'
        externalIds:
          $ref: '#/components/schemas/ExternalIds'
        name:
          type: string
        alternativeNames:
          type: array
          items:
            type: string
        acronym:
          type: string
        type:
          $ref: '#/components/schemas/InstitutionType'
        location:
          type: object
          properties:
            city:
              type: string
            region:
              type: string
            country:
              type: string
            countryName:
              type: string
        homepage:
          type: string
          format: uri
        metrics:
          type: object
          properties:
            worksCount:
              type: integer
            citationCount:
              type: integer
        updatedAt:
          type: string
          format: date-time
        _raw:
          type: object

    Venue:
      type: object
      required:
        - id
        - source
        - name
        - type
        - updatedAt
      properties:
        _type:
          type: string
          const: 'venue'
        id:
          type: string
        source:
          $ref: '#/components/schemas/SourceType'
        externalIds:
          $ref: '#/components/schemas/ExternalIds'
        name:
          type: string
        abbreviation:
          type: string
        type:
          $ref: '#/components/schemas/VenueType'
        publisher:
          type: string
        isOa:
          type: boolean
        homepage:
          type: string
          format: uri
        updatedAt:
          type: string
          format: date-time
        _raw:
          type: object

    Funder:
      type: object
      required:
        - id
        - source
        - name
      properties:
        _type:
          type: string
          const: 'funder'
        id:
          type: string
        source:
          $ref: '#/components/schemas/SourceType'
        externalIds:
          $ref: '#/components/schemas/ExternalIds'
        name:
          type: string
        country:
          type: string
        awardId:
          type: string
        _raw:
          type: object

    # ═══════════════════════════════════════════════════════════════════
    # COMMON TYPES
    # ═══════════════════════════════════════════════════════════════════

    ExternalIds:
      type: object
      description: External identifiers
      properties:
        doi:
          type: string
          pattern: '^10\.\d{4,}/.*$'
        orcid:
          type: string
          pattern: '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$'
        openalex:
          type: string
        crossref:
          type: string
        hal:
          type: string
        arxiv:
          type: string
        pmid:
          type: string
        pmcid:
          type: string
        s2:
          type: string
        dblp:
          type: string
        core:
          type: string
        zenodo:
          type: string
        datacite:
          type: string
        ror:
          type: string
        grid:
          type: string
        isni:
          type: string
        wikidata:
          type: string
        fundref:
          type: string
        issn:
          type: string
        issns:
          type: array
          items:
            type: string
        issnL:
          type: string

    OpenAccess:
      type: object
      properties:
        isOa:
          type: boolean
        status:
          $ref: '#/components/schemas/OpenAccessStatus'
        pdfUrl:
          type: string
          format: uri
        oaUrl:
          type: string
          format: uri
        license:
          type: string
        version:
          $ref: '#/components/schemas/OaVersion'
        locations:
          type: array
          items:
            $ref: '#/components/schemas/OaLocation'

    OaLocation:
      type: object
      properties:
        url:
          type: string
          format: uri
        pdfUrl:
          type: string
          format: uri
        hostType:
          type: string
          enum: [publisher, repository]
        license:
          type: string
        version:
          $ref: '#/components/schemas/OaVersion'
        repositoryName:
          type: string

    WorkReference:
      type: object
      properties:
        doi:
          type: string
        externalIds:
          type: object
          properties:
            doi:
              type: string
            openalex:
              type: string
            pmid:
              type: string
        position:
          type: integer
        rawText:
          type: string

    RelatedIdentifier:
      type: object
      required:
        - id
        - idType
        - relationType
      properties:
        id:
          type: string
        idType:
          type: string
          enum: [doi, url, arxiv, pmid, handle]
        relationType:
          type: string
          enum:
            - cites
            - is-cited-by
            - supplements
            - is-supplemented-by
            - references
            - is-referenced-by
            - documents
            - is-documented-by
            - compiles
            - is-compiled-by
            - is-variant-of
            - is-original-of
            - is-version-of
            - has-version
            - is-part-of
            - has-part
            - is-derived-from
            - is-source-of

    # Reference types for nested objects
    VenueRef:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        issn:
          type: string
        type:
          $ref: '#/components/schemas/VenueType'

    InstitutionRef:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        ror:
          type: string
        country:
          type: string

    FunderRef:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        awardId:
          type: string

    # ═══════════════════════════════════════════════════════════════════
    # RESPONSES
    # ═══════════════════════════════════════════════════════════════════

    WorksResponse:
      type: object
      required:
        - results
        - meta
      properties:
        results:
          type: array
          items:
            $ref: '#/components/schemas/Work'
        meta:
          $ref: '#/components/schemas/PaginationMeta'

    AuthorsResponse:
      type: object
      required:
        - results
        - meta
      properties:
        results:
          type: array
          items:
            $ref: '#/components/schemas/Author'
        meta:
          $ref: '#/components/schemas/PaginationMeta'

    InstitutionsResponse:
      type: object
      required:
        - results
        - meta
      properties:
        results:
          type: array
          items:
            $ref: '#/components/schemas/Institution'
        meta:
          $ref: '#/components/schemas/PaginationMeta'

    VenuesResponse:
      type: object
      required:
        - results
        - meta
      properties:
        results:
          type: array
          items:
            $ref: '#/components/schemas/Venue'
        meta:
          $ref: '#/components/schemas/PaginationMeta'

    FundersResponse:
      type: object
      required:
        - results
        - meta
      properties:
        results:
          type: array
          items:
            $ref: '#/components/schemas/Funder'
        meta:
          $ref: '#/components/schemas/PaginationMeta'

    PaginationMeta:
      type: object
      required:
        - page
        - perPage
        - totalResults
        - totalPages
      properties:
        page:
          type: integer
        perPage:
          type: integer
        totalResults:
          type: integer
        totalPages:
          type: integer
        sources:
          type: array
          items:
            type: object
            properties:
              source:
                $ref: '#/components/schemas/SourceType'
              count:
                type: integer
              took:
                type: integer
                description: Response time in ms

    HealthResponse:
      type: object
      properties:
        status:
          type: string
          enum: [healthy, degraded, unhealthy]
        version:
          type: string
        uptime:
          type: integer
          description: Seconds since startup

    RateLimitsResponse:
      type: object
      additionalProperties:
        type: object
        properties:
          remaining:
            type: integer
            nullable: true
          limit:
            type: integer
            nullable: true
          resetAt:
            type: string
            format: date-time
            nullable: true
          usedToday:
            type: integer

    SourcesHealthResponse:
      type: object
      additionalProperties:
        type: object
        properties:
          status:
            type: string
            enum: [healthy, degraded, down]
          latency:
            type: integer
            nullable: true
            description: Latency in ms
          lastCheck:
            type: string
            format: date-time

    Error:
      type: object
      required:
        - error
        - message
      properties:
        error:
          type: string
        message:
          type: string
        details:
          type: object

    RateLimitError:
      type: object
      required:
        - error
        - message
        - source
        - retryAfter
      properties:
        error:
          type: string
          const: 'RATE_LIMITED'
        message:
          type: string
        source:
          $ref: '#/components/schemas/SourceType'
        retryAfter:
          type: integer
          description: Seconds before retry
        resetAt:
          type: string
          format: date-time
```

---

## Ideal Coverage Table

The following table shows the maximum theoretical coverage achievable by combining all sources:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        IDEAL ATLAS-CITATIONS COVERAGE                            │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  FEATURE                      │ COVERAGE   │ PRIMARY SOURCES                   │
│  ───────────────────────────────────────────────────────────────────────────   │
│  Publications (Works)         │ 250M+      │ OpenAlex, CORE, S2                │
│  Author profiles              │ 100M+      │ ORCID, OpenAlex, S2               │
│  Institutions                 │ 100k+      │ ROR via OpenAlex                  │
│  Journals/Venues              │ 250k+      │ OpenAlex, DOAJ                    │
│  Funders                      │ 30k+       │ OpenAlex, Crossref                │
│                                                                                 │
│  ───────────────────────────────────────────────────────────────────────────   │
│                                                                                 │
│  ENRICHMENT                   │            │                                   │
│  ───────────────────────────────────────────────────────────────────────────   │
│  Citations (graph)            │ 1.4B+      │ OpenCitations, S2, OpenAlex       │
│  Open Access (status + URLs)  │ 40M+ DOIs  │ Unpaywall, OpenAlex               │
│  Full text                    │ 50M+       │ CORE, Europe PMC, ArXiv           │
│  Semantic embeddings          │ 200M+      │ Semantic Scholar (SPECTER)        │
│  AI summaries (TL;DR)         │ 200M+      │ Semantic Scholar                  │
│  Text-mining annotations      │ 35M+       │ Europe PMC                        │
│  Funding data                 │ 20M+       │ OpenAlex, Crossref                │
│                                                                                 │
│  ───────────────────────────────────────────────────────────────────────────   │
│                                                                                 │
│  SPECIALIZED DOMAINS          │            │                                   │
│  ───────────────────────────────────────────────────────────────────────────   │
│  Biomedical                   │ 40M+       │ PubMed, Europe PMC, bioRxiv       │
│  Computer Science             │ 6M+        │ DBLP, Semantic Scholar            │
│  Preprints                    │ 500k+      │ ArXiv, bioRxiv, medRxiv           │
│  Research data                │ 50M+       │ DataCite, Zenodo                  │
│  France/HAL                   │ 4M+        │ HAL                               │
│  Open Access exclusive        │ 9M+        │ DOAJ                              │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Recommended Implementation

### Source Implementation Order

| Phase | Sources | Justification |
|-------|---------|---------------|
| **1** | OpenAlex, Crossref, HAL, ArXiv, ORCID | Solid base, already planned |
| **2** | Semantic Scholar, Unpaywall, OpenCitations | Enrichment (citations, OA, embeddings) |
| **3** | PubMed, Europe PMC | Biomedical |
| **4** | CORE, DataCite, Zenodo, DOAJ | Supplements (text, data, OA) |
| **5** | DBLP, bioRxiv/medRxiv | Specialized domains |

### Recommended Configuration by Use Case

```typescript
// General search
const generalClient = createCitationsClient({
  defaultSources: ['openalex', 'crossref'],
  parallelRequests: true,
});

// Biomedical search
const biomedClient = createCitationsClient({
  defaultSources: ['pubmed', 'europepmc', 'biorxiv'],
  parallelRequests: true,
});

// Search with OA enrichment
const oaClient = createCitationsClient({
  defaultSources: ['openalex', 'crossref'],
  enrichWith: ['unpaywall'],  // Enriches results with OA URLs
  parallelRequests: true,
});

// Search with citation graph
const citationsClient = createCitationsClient({
  defaultSources: ['openalex', 'semanticscholar'],
  includeCitations: true,
  includeReferences: true,
});

// France/institutional search
const frenchClient = createCitationsClient({
  defaultSources: ['hal', 'openalex'],
  filterCountry: 'FR',
});
```

---

## Associated Files

- **OpenAPI Spec**: `packages/citations/specs/citations.yaml`
- **TypeScript Types**: `packages/citations/src/entities/*.ts`
- **Adapters**: `packages/citations/src/adapters/*.ts`
- **Entity Documentation**: [Entity Reference by Source](./sources/entities-reference.md)
- **Source Catalog**: [Complete Catalog](./sources/catalog.md)
