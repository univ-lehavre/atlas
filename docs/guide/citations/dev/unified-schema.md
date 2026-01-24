# Schéma unifié atlas-citations

Ce document définit le schéma unifié de `@univ-lehavre/atlas-citations`, le dénominateur commun entre toutes les sources bibliographiques, et la spécification OpenAPI complète.

> **Voir aussi :**
> - [Client unifié](./citations-client.md) - Utilisation du client agrégateur
> - [Catalogue des sources](./sources/catalog.md) - Détail de chaque source bibliographique
> - [Référence entités](./sources/entities-reference.md) - Entités par source
>
> **Documentation utilisateur :** [Les sources de données](../user/sources.md) - Guide pour chercheurs

## Analyse du dénominateur commun

### Méthodologie

Pour construire un schéma unifié pertinent, nous avons analysé les entités et champs de 15+ sources bibliographiques. Le schéma retenu maximise :

1. **Couverture** : champs présents dans la majorité des sources
2. **Utilité** : champs fréquemment utilisés en pratique
3. **Interopérabilité** : identifiants permettant le croisement entre sources

### Matrice de disponibilité des champs

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           MATRICE DE DISPONIBILITÉ DES CHAMPS                                   │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  CHAMP WORK          │ OA │ CR │ HAL│ ArX│ ORC│ S2 │ PM │ EPM│ DC │ ZEN│ DBL│ BRX│ COR│ UNIF │
│  ────────────────────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼──────│
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
│  ✅ = Disponible   ⚠️ = Partiel/Optionnel   ❌ = Non disponible                                │
│                                                                                                 │
│  OA=OpenAlex, CR=Crossref, HAL, ArX=ArXiv, ORC=ORCID, S2=SemanticScholar,                      │
│  PM=PubMed, EPM=EuropePMC, DC=DataCite, ZEN=Zenodo, DBL=DBLP, BRX=bioRxiv, COR=CORE           │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Champs retenus pour le schéma unifié

| Catégorie | Champs | Justification |
|-----------|--------|---------------|
| **Identifiants** | `id`, `externalIds` | Obligatoires pour le croisement inter-sources |
| **Core** | `title`, `authors`, `publicationDate`, `type` | Présents dans 100% des sources |
| **Contenu** | `abstract`, `keywords` | Présents dans 80%+ des sources |
| **Publication** | `venue`, `volume`, `issue`, `pages` | Essentiels pour les citations |
| **Métriques** | `citationCount` | Présent dans 60%+ des sources |
| **Open Access** | `isOpenAccess`, `openAccessStatus`, `pdfUrl`, `license` | Critiques pour l'accès |
| **Relations** | `references`, `funders` | Présents dans 50%+ des sources |
| **Métadonnées** | `language`, `source`, `updatedAt` | Contexte et traçabilité |
| **Raw** | `_raw` | Données complètes de la source pour cas avancés |

---

## Schéma unifié détaillé

### Entités principales

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTITÉS ATLAS-CITATIONS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │     Work     │───>│    Author    │<───│  Institution │                   │
│  │ (Publication)│    │ (Chercheur)  │    │(Organisation)│                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                   │                   │                            │
│         │                   │                   │                            │
│         ▼                   ▼                   ▼                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │    Venue     │    │  Affiliation │    │    Funder    │                   │
│  │(Journal/Conf)│    │   (Poste)    │    │ (Financeur)  │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Work (Publication)

L'entité centrale du schéma unifié.

```typescript
interface Work {
  // ═══════════════════════════════════════════════════════════════
  // IDENTIFIANTS
  // ═══════════════════════════════════════════════════════════════

  /** Identifiant unique dans atlas-citations (préfixé par source) */
  id: string;                          // "openalex:W2741809807"

  /** Source d'origine */
  source: SourceType;                  // "openalex" | "crossref" | ...

  /** Identifiants externes connus */
  externalIds: {
    doi?: string;                      // "10.1038/nature12373"
    openalex?: string;                 // "W2741809807"
    crossref?: string;                 // Identique au DOI
    hal?: string;                      // "hal-01234567"
    arxiv?: string;                    // "2301.12345"
    pmid?: string;                     // "12345678"
    pmcid?: string;                    // "PMC1234567"
    s2?: string;                       // Semantic Scholar ID
    dblp?: string;                     // "journals/nature/Smith23"
    core?: string;                     // CORE ID
    zenodo?: string;                   // "1234567"
    datacite?: string;                 // DOI DataCite
  };

  // ═══════════════════════════════════════════════════════════════
  // MÉTADONNÉES BIBLIOGRAPHIQUES (Core)
  // ═══════════════════════════════════════════════════════════════

  /** Titre de la publication */
  title: string;

  /** Liste des auteurs */
  authors: WorkAuthor[];

  /** Date de publication (ISO 8601) */
  publicationDate?: string;            // "2023-06-15"

  /** Année de publication */
  year?: number;                       // 2023

  /** Type de publication normalisé */
  type: WorkType;

  /** Type original de la source */
  originalType?: string;               // "journal-article", "Article", etc.

  // ═══════════════════════════════════════════════════════════════
  // CONTENU
  // ═══════════════════════════════════════════════════════════════

  /** Résumé */
  abstract?: string;

  /** Mots-clés (normalisés) */
  keywords?: string[];

  /** Domaines de recherche */
  fieldsOfStudy?: string[];

  /** Langue (ISO 639-1) */
  language?: string;                   // "en", "fr"

  // ═══════════════════════════════════════════════════════════════
  // PUBLICATION (Venue)
  // ═══════════════════════════════════════════════════════════════

  /** Lieu de publication */
  venue?: Venue;

  /** Volume */
  volume?: string;

  /** Numéro */
  issue?: string;

  /** Pages */
  pages?: string;                      // "123-145"

  /** Éditeur */
  publisher?: string;

  // ═══════════════════════════════════════════════════════════════
  // MÉTRIQUES
  // ═══════════════════════════════════════════════════════════════

  /** Nombre de citations */
  citationCount?: number;

  /** Nombre de références */
  referenceCount?: number;

  /** Citations influentes (Semantic Scholar) */
  influentialCitationCount?: number;

  // ═══════════════════════════════════════════════════════════════
  // OPEN ACCESS
  // ═══════════════════════════════════════════════════════════════

  /** Statut Open Access */
  openAccess?: {
    /** Est Open Access ? */
    isOa: boolean;

    /** Statut OA normalisé */
    status: OpenAccessStatus;          // "gold" | "green" | "hybrid" | "bronze" | "closed"

    /** URL PDF direct (si disponible) */
    pdfUrl?: string;

    /** URL landing page OA */
    oaUrl?: string;

    /** Licence */
    license?: string;                  // "cc-by", "cc-by-nc", etc.

    /** Version OA */
    version?: OaVersion;               // "published" | "accepted" | "submitted"

    /** Toutes les localisations OA */
    locations?: OaLocation[];
  };

  // ═══════════════════════════════════════════════════════════════
  // RELATIONS
  // ═══════════════════════════════════════════════════════════════

  /** Références citées */
  references?: WorkReference[];

  /** Financements */
  funders?: Funder[];

  /** Identifiants liés (datasets, code, etc.) */
  relatedIdentifiers?: RelatedIdentifier[];

  // ═══════════════════════════════════════════════════════════════
  // MÉTADONNÉES
  // ═══════════════════════════════════════════════════════════════

  /** Date de dernière mise à jour dans atlas-citations */
  updatedAt: string;

  /** Données brutes de la source originale */
  _raw: unknown;
}

// ═══════════════════════════════════════════════════════════════════
// TYPES ÉNUMÉRÉS
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
  | 'article'           // Article de journal
  | 'preprint'          // Preprint
  | 'conference-paper'  // Article de conférence
  | 'book'              // Livre
  | 'book-chapter'      // Chapitre de livre
  | 'thesis'            // Thèse
  | 'dissertation'      // Mémoire
  | 'report'            // Rapport technique
  | 'dataset'           // Jeu de données
  | 'software'          // Logiciel
  | 'review'            // Article de revue
  | 'editorial'         // Éditorial
  | 'letter'            // Lettre/Correspondance
  | 'erratum'           // Erratum
  | 'other';            // Autre

type OpenAccessStatus =
  | 'gold'              // OA chez l'éditeur (journal OA)
  | 'green'             // OA dans un dépôt
  | 'hybrid'            // OA dans journal hybride
  | 'bronze'            // Lecture gratuite (sans licence)
  | 'diamond'           // OA sans APC
  | 'closed';           // Accès fermé

type OaVersion =
  | 'published'         // Version éditeur
  | 'accepted'          // Manuscrit accepté (AAM)
  | 'submitted';        // Preprint soumis
```

### WorkAuthor (Auteur d'une publication)

```typescript
interface WorkAuthor {
  /** Position dans la liste d'auteurs */
  position: number;

  /** Nom affiché */
  displayName: string;

  /** Prénom (si séparé) */
  firstName?: string;

  /** Nom de famille (si séparé) */
  lastName?: string;

  /** ORCID */
  orcid?: string;

  /** Identifiants par source */
  externalIds?: {
    openalex?: string;
    hal?: string;
    s2?: string;
    dblp?: string;
  };

  /** Affiliations au moment de la publication */
  affiliations?: WorkAffiliation[];

  /** Est auteur correspondant ? */
  isCorresponding?: boolean;
}

interface WorkAffiliation {
  /** Nom de l'institution */
  name: string;

  /** ROR ID */
  ror?: string;

  /** Pays (ISO 3166-1 alpha-2) */
  country?: string;
}
```

### Author (Profil auteur)

```typescript
interface Author {
  /** Identifiant unique atlas-citations */
  id: string;                          // "orcid:0000-0002-1825-0097"

  /** Source d'origine */
  source: SourceType;

  /** Identifiants externes */
  externalIds: {
    orcid?: string;
    openalex?: string;
    hal?: string;
    s2?: string;
    dblp?: string;
    scopus?: string;
  };

  /** Nom affiché */
  displayName: string;

  /** Noms alternatifs / alias */
  alternativeNames?: string[];

  /** Affiliations actuelles */
  affiliations?: Affiliation[];

  /** Métriques */
  metrics?: {
    worksCount?: number;
    citationCount?: number;
    hIndex?: number;
    i10Index?: number;
  };

  /** URL du profil */
  profileUrl?: string;

  /** Page personnelle */
  homepage?: string;

  /** Dernière mise à jour */
  updatedAt: string;

  /** Données brutes */
  _raw: unknown;
}

interface Affiliation {
  /** Institution */
  institution: Institution;

  /** Dates (si connues) */
  startYear?: number;
  endYear?: number;

  /** Rôle */
  role?: string;
}
```

### Institution (Organisation)

```typescript
interface Institution {
  /** Identifiant unique atlas-citations */
  id: string;                          // "ror:03yrm5c26"

  /** Source d'origine */
  source: SourceType;

  /** Identifiants externes */
  externalIds: {
    ror?: string;                      // "03yrm5c26"
    openalex?: string;                 // "I27837315"
    grid?: string;                     // Obsolète mais présent
    isni?: string;
    wikidata?: string;
    fundref?: string;
  };

  /** Nom officiel */
  name: string;

  /** Noms alternatifs */
  alternativeNames?: string[];

  /** Acronyme */
  acronym?: string;

  /** Type */
  type?: InstitutionType;

  /** Localisation */
  location?: {
    city?: string;
    region?: string;
    country: string;                   // ISO 3166-1 alpha-2
    countryName?: string;
  };

  /** URL du site */
  homepage?: string;

  /** Métriques */
  metrics?: {
    worksCount?: number;
    citationCount?: number;
  };

  /** Dernière mise à jour */
  updatedAt: string;

  /** Données brutes */
  _raw: unknown;
}

type InstitutionType =
  | 'education'         // Université, école
  | 'healthcare'        // Hôpital, CHU
  | 'company'           // Entreprise
  | 'government'        // Gouvernement, ministère
  | 'nonprofit'         // ONG, association
  | 'facility'          // Infrastructure de recherche
  | 'archive'           // Archive, bibliothèque
  | 'other';
```

### Venue (Journal/Conférence)

```typescript
interface Venue {
  /** Identifiant unique atlas-citations */
  id: string;

  /** Source d'origine */
  source: SourceType;

  /** Identifiants externes */
  externalIds: {
    openalex?: string;
    issn?: string;                     // ISSN-L ou premier ISSN
    issns?: string[];                  // Tous les ISSNs
    issnL?: string;
    eissn?: string;
    pissn?: string;
    doaj?: string;
  };

  /** Nom */
  name: string;

  /** Nom abrégé */
  abbreviation?: string;

  /** Type */
  type: VenueType;

  /** Éditeur */
  publisher?: string;

  /** Est Open Access ? */
  isOa?: boolean;

  /** URL */
  homepage?: string;

  /** Dernière mise à jour */
  updatedAt: string;

  /** Données brutes */
  _raw: unknown;
}

type VenueType =
  | 'journal'
  | 'conference'
  | 'repository'
  | 'book-series'
  | 'other';
```

### Funder (Financeur)

```typescript
interface Funder {
  /** Identifiant unique atlas-citations */
  id: string;

  /** Source d'origine */
  source: SourceType;

  /** Identifiants externes */
  externalIds: {
    openalex?: string;
    crossref?: string;                 // Funder Registry ID
    ror?: string;
    fundref?: string;
    doi?: string;
  };

  /** Nom */
  name: string;

  /** Pays */
  country?: string;

  /** Numéro de grant/award */
  awardId?: string;

  /** Données brutes */
  _raw: unknown;
}
```

### Types auxiliaires

```typescript
interface WorkReference {
  /** DOI de la référence */
  doi?: string;

  /** Identifiants connus */
  externalIds?: {
    doi?: string;
    openalex?: string;
    pmid?: string;
  };

  /** Position dans la liste des références */
  position?: number;

  /** Texte brut de la référence (si DOI inconnu) */
  rawText?: string;
}

interface OaLocation {
  /** URL de la ressource */
  url: string;

  /** URL directe du PDF */
  pdfUrl?: string;

  /** Type d'hébergeur */
  hostType: 'publisher' | 'repository';

  /** Licence */
  license?: string;

  /** Version */
  version?: OaVersion;

  /** Nom du dépôt (si repository) */
  repositoryName?: string;
}

interface RelatedIdentifier {
  /** Identifiant */
  id: string;

  /** Type d'identifiant */
  idType: 'doi' | 'url' | 'arxiv' | 'pmid' | 'handle';

  /** Type de relation */
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

## Mapping sources vers schéma unifié

### Work : Table de correspondance

| Champ unifié | OpenAlex | Crossref | HAL | ArXiv | Semantic Scholar | PubMed |
|--------------|----------|----------|-----|-------|------------------|--------|
| `id` | `id` | `DOI` | `docid` | `id` | `paperId` | `PMID` |
| `title` | `title` | `title[0]` | `title_s` | `title` | `title` | `ArticleTitle` |
| `doi` | `doi` | `DOI` | `doiId_s` | — | `externalIds.DOI` | `ELocationID[doi]` |
| `authors[].displayName` | `authorships[].author.display_name` | `author[].given + family` | `authFullName_s` | `authors[].name` | `authors[].name` | `AuthorList[].ForeName + LastName` |
| `authors[].orcid` | `authorships[].author.orcid` | `author[].ORCID` | `authOrcidIdExt_s` | — | `authors[].externalIds.ORCID` | `AuthorList[].Identifier[Source=ORCID]` |
| `publicationDate` | `publication_date` | `published.date-parts` | `publicationDate_s` | `published` | `publicationDate` | `PubDate` |
| `year` | `publication_year` | `published.date-parts[0][0]` | `publicationDateY_i` | — | `year` | `PubDate/Year` |
| `type` | `type` | `type` | `docType_s` | — | `publicationTypes[0]` | `PublicationType` |
| `abstract` | `abstract` | `abstract` | `abstract_s` | `summary` | `abstract` | `Abstract/AbstractText` |
| `keywords` | `keywords[].keyword` | — | `keyword_s` | `categories` | `fieldsOfStudy` | `KeywordList` |
| `venue.name` | `primary_location.source.display_name` | `container-title[0]` | `journalTitle_s` | — | `venue` | `Journal/Title` |
| `venue.issn` | `primary_location.source.issn_l` | `ISSN[0]` | `journalIdExt_s` | — | `publicationVenue.issn` | `Journal/ISSN` |
| `volume` | `biblio.volume` | `volume` | `volume_s` | — | `journal.volume` | `Volume` |
| `issue` | `biblio.issue` | `issue` | `issue_s` | — | — | `Issue` |
| `pages` | `biblio.first_page-last_page` | `page` | `page_s` | — | `journal.pages` | `Pagination` |
| `publisher` | `primary_location.source.host_organization_name` | `publisher` | `publisher_s` | — | — | `Publisher` |
| `citationCount` | `cited_by_count` | `is-referenced-by-count` | — | — | `citationCount` | — |
| `referenceCount` | `referenced_works_count` | `reference-count` | — | — | `referenceCount` | — |
| `openAccess.isOa` | `open_access.is_oa` | — | `openAccess_bool` | `true` | `isOpenAccess` | — |
| `openAccess.status` | `open_access.oa_status` | — | — | `"green"` | — | — |
| `openAccess.pdfUrl` | `open_access.oa_url` | — | `fileMain_s` | `links[rel=pdf].href` | `openAccessPdf.url` | `pmc/pdf` |
| `openAccess.license` | `primary_location.license` | `license[0].URL` | `licence_s` | — | — | — |
| `language` | `language` | `language` | `language_s` | — | — | `Language` |
| `funders` | `grants[].funder` | `funder` | `anrProjectId_s` | — | — | `GrantList` |
| `references` | `referenced_works` | `reference` | — | — | `references` | `ReferenceList` |

### Normalisation des types

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
      // ArXiv = toujours preprint
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

### Normalisation Open Access status

```typescript
const normalizeOaStatus = (
  source: SourceType,
  data: unknown
): OpenAccessStatus => {
  switch (source) {
    case 'openalex':
      return data.open_access?.oa_status ?? 'closed';

    case 'crossref':
      // Crossref n'a pas de champ OA direct
      // Déduire depuis license ou utiliser Unpaywall
      if (data.license?.some(l => l.URL?.includes('creativecommons'))) {
        return 'hybrid';
      }
      return 'closed';

    case 'hal':
      return data.openAccess_bool ? 'green' : 'closed';

    case 'arxiv':
      return 'green'; // ArXiv = toujours green OA

    case 'biorxiv':
    case 'medrxiv':
      return 'green'; // Preprint servers = green

    case 'doaj':
      return 'gold'; // DOAJ = toujours gold

    case 'zenodo':
      return data.metadata?.access_right === 'open' ? 'green' : 'closed';

    default:
      return 'closed';
  }
};
```

---

## Spécification OpenAPI complète

La spec OpenAPI complète de atlas-citations est disponible dans `packages/citations/specs/citations.yaml`.

```yaml
openapi: '3.1.0'
info:
  title: Atlas Citations API
  version: '1.0.0'
  description: |
    API unifiée pour interroger plusieurs sources bibliographiques.

    Agrège de manière transparente :
    - **Priorité 1** : OpenAlex, Crossref, HAL, ArXiv, ORCID
    - **Priorité 2** : Semantic Scholar, PubMed, Unpaywall, OpenCitations
    - **Priorité 3** : Europe PMC, DataCite, DOAJ, Zenodo, CORE
    - **Spécialisées** : DBLP, bioRxiv/medRxiv

    ## Sélection de sources

    Par défaut, le client sélectionne automatiquement les sources les plus
    pertinentes selon l'identifiant ou la requête. Vous pouvez forcer des
    sources spécifiques via le paramètre `sources`.

    ## Rate limiting

    Chaque source a ses propres limites. L'API gère automatiquement le
    backoff et expose les quotas via `/health/rate-limits`.
  contact:
    name: Université Le Havre Normandie
    url: https://github.com/univ-lehavre/atlas
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: '{baseUrl}'
    description: Serveur atlas-citations
    variables:
      baseUrl:
        default: 'http://localhost:3000'
        description: URL de base du serveur

tags:
  - name: Works
    description: Publications scientifiques
  - name: Authors
    description: Profils d'auteurs
  - name: Institutions
    description: Organisations et affiliations
  - name: Venues
    description: Journaux et conférences
  - name: Funders
    description: Financeurs de recherche
  - name: Resolve
    description: Résolution universelle d'identifiants
  - name: Health
    description: Monitoring et rate limits

paths:
  # ════════════════════════════════════════════════════════════════════
  # WORKS
  # ════════════════════════════════════════════════════════════════════

  /works:
    get:
      operationId: searchWorks
      summary: Rechercher des publications
      tags: [Works]
      parameters:
        - $ref: '#/components/parameters/query'
        - $ref: '#/components/parameters/sources'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
        - name: filter
          in: query
          description: |
            Filtres sur les champs. Format: `field:value` ou `field:op:value`.
            Exemples:
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
            Tri des résultats. Format: `field:direction`.
            Exemples: `citationCount:desc`, `publicationDate:asc`
          schema:
            type: string
            default: 'relevance:desc'
        - name: fields
          in: query
          description: |
            Champs à inclure dans la réponse (projection).
            Par défaut, tous les champs standards sont inclus.
            Utilisez `_raw` pour inclure les données brutes.
          schema:
            type: array
            items:
              type: string
          style: form
          explode: false
      responses:
        '200':
          description: Résultats de recherche
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
      summary: Récupérer une publication par identifiant
      tags: [Works]
      parameters:
        - name: id
          in: path
          required: true
          description: |
            Identifiant de la publication. Formats supportés :
            - DOI : `10.1038/nature12373`
            - OpenAlex : `W2741809807` ou `openalex:W2741809807`
            - HAL : `hal-01234567`
            - ArXiv : `2301.12345` ou `arxiv:2301.12345`
            - PMID : `pmid:12345678`
            - Semantic Scholar : `s2:abc123...`
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
          description: Publication trouvée
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
      summary: Récupérer les références d'une publication
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
          description: Références de la publication
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorksResponse'

  /works/{id}/citations:
    get:
      operationId: getWorkCitations
      summary: Récupérer les citations d'une publication
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
          description: Articles citant cette publication
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
      summary: Rechercher des auteurs
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
          description: Résultats de recherche
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthorsResponse'

  /authors/{id}:
    get:
      operationId: getAuthor
      summary: Récupérer un auteur par identifiant
      tags: [Authors]
      parameters:
        - name: id
          in: path
          required: true
          description: |
            Identifiant de l'auteur :
            - ORCID : `0000-0002-1825-0097`
            - OpenAlex : `A5023888391`
            - HAL : `hal-00001`
            - Semantic Scholar : `s2:1741101`
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
      responses:
        '200':
          description: Auteur trouvé
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Author'
        '404':
          $ref: '#/components/responses/NotFound'

  /authors/{id}/works:
    get:
      operationId: getAuthorWorks
      summary: Publications d'un auteur
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
          description: Publications de l'auteur
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
      summary: Rechercher des institutions
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
          description: Résultats de recherche
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InstitutionsResponse'

  /institutions/{id}:
    get:
      operationId: getInstitution
      summary: Récupérer une institution par identifiant
      tags: [Institutions]
      parameters:
        - name: id
          in: path
          required: true
          description: |
            Identifiant de l'institution :
            - ROR : `03yrm5c26`
            - OpenAlex : `I27837315`
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
      responses:
        '200':
          description: Institution trouvée
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Institution'

  /institutions/{id}/works:
    get:
      operationId: getInstitutionWorks
      summary: Publications d'une institution
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
          description: Publications de l'institution
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorksResponse'

  /institutions/{id}/authors:
    get:
      operationId: getInstitutionAuthors
      summary: Auteurs d'une institution
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
          description: Auteurs affiliés à l'institution
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
      summary: Rechercher des venues (journaux, conférences)
      tags: [Venues]
      parameters:
        - $ref: '#/components/parameters/query'
        - $ref: '#/components/parameters/sources'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
      responses:
        '200':
          description: Résultats de recherche
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VenuesResponse'

  /venues/{id}:
    get:
      operationId: getVenue
      summary: Récupérer une venue par identifiant
      tags: [Venues]
      parameters:
        - name: id
          in: path
          required: true
          description: ISSN, OpenAlex ID, ou DOAJ ID
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
      responses:
        '200':
          description: Venue trouvée
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
      summary: Rechercher des financeurs
      tags: [Funders]
      parameters:
        - $ref: '#/components/parameters/query'
        - $ref: '#/components/parameters/sources'
        - $ref: '#/components/parameters/page'
        - $ref: '#/components/parameters/perPage'
      responses:
        '200':
          description: Résultats de recherche
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FundersResponse'

  /funders/{id}:
    get:
      operationId: getFunder
      summary: Récupérer un financeur par identifiant
      tags: [Funders]
      parameters:
        - name: id
          in: path
          required: true
          description: OpenAlex ID, Crossref Funder ID, ou ROR
          schema:
            type: string
        - $ref: '#/components/parameters/sources'
      responses:
        '200':
          description: Financeur trouvé
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Funder'

  /funders/{id}/works:
    get:
      operationId: getFunderWorks
      summary: Publications financées
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
          description: Publications financées
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
      summary: Résoudre un identifiant
      description: |
        Détecte automatiquement le type d'identifiant et retourne l'entité
        correspondante.

        **Identifiants supportés :**
        - DOI : `10.1038/nature12373` → Work
        - ORCID : `0000-0002-1825-0097` → Author
        - ROR : `03yrm5c26` → Institution
        - ISSN : `1234-5678` → Venue
        - OpenAlex : `W...` | `A...` | `I...` | `S...` | `F...`
        - HAL : `hal-...` → Work
        - ArXiv : `1234.56789` → Work
        - PMID : `12345678` → Work
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
          description: Entité résolue
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
      summary: État de santé du service
      tags: [Health]
      responses:
        '200':
          description: État du service
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'

  /health/rate-limits:
    get:
      operationId: getRateLimits
      summary: Quotas par source
      tags: [Health]
      responses:
        '200':
          description: État des quotas
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RateLimitsResponse'

  /health/sources:
    get:
      operationId: getSourcesHealth
      summary: État de santé par source
      tags: [Health]
      responses:
        '200':
          description: État des sources
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
      description: Terme de recherche
      schema:
        type: string
      example: 'machine learning'

    sources:
      name: sources
      in: query
      description: |
        Sources à interroger. Si omis, sélection automatique intelligente.
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
      description: Numéro de page (1-indexed)
      schema:
        type: integer
        minimum: 1
        default: 1

    perPage:
      name: per_page
      in: query
      description: Résultats par page (max 100)
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
      description: Requête invalide
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    NotFound:
      description: Ressource non trouvée
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    RateLimited:
      description: Quota dépassé
      headers:
        Retry-After:
          description: Secondes avant retry
          schema:
            type: integer
        X-RateLimit-Source:
          description: Source ayant atteint sa limite
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
      description: Source bibliographique

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
      description: Type de publication

    OpenAccessStatus:
      type: string
      enum:
        - gold
        - green
        - hybrid
        - bronze
        - diamond
        - closed
      description: Statut Open Access

    OaVersion:
      type: string
      enum:
        - published
        - accepted
        - submitted
      description: Version du manuscrit OA

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
          description: Identifiant unique atlas-citations
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
          description: Type original de la source
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
          description: Code ISO 639-1
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
          description: Données brutes de la source

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
          description: Code ISO 3166-1 alpha-2

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
      description: Identifiants externes
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
                description: Temps de réponse en ms

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
          description: Secondes depuis démarrage

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
            description: Latence en ms
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
          description: Secondes avant retry
        resetAt:
          type: string
          format: date-time
```

---

## Tableau idéal de couverture

Le tableau suivant montre la couverture théorique maximale atteignable en combinant toutes les sources :

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        COUVERTURE IDÉALE ATLAS-CITATIONS                        │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  FONCTIONNALITÉ              │ COUVERTURE │ SOURCES PRINCIPALES                │
│  ───────────────────────────────────────────────────────────────────────────   │
│  Publications (Works)         │ 250M+      │ OpenAlex, CORE, S2                │
│  Profils auteurs              │ 100M+      │ ORCID, OpenAlex, S2               │
│  Institutions                 │ 100k+      │ ROR via OpenAlex                  │
│  Journaux/Venues              │ 250k+      │ OpenAlex, DOAJ                    │
│  Financeurs                   │ 30k+       │ OpenAlex, Crossref                │
│                                                                                 │
│  ───────────────────────────────────────────────────────────────────────────   │
│                                                                                 │
│  ENRICHISSEMENT               │            │                                   │
│  ───────────────────────────────────────────────────────────────────────────   │
│  Citations (graphe)           │ 1.4B+      │ OpenCitations, S2, OpenAlex       │
│  Open Access (status + URLs)  │ 40M+ DOIs  │ Unpaywall, OpenAlex               │
│  Texte intégral               │ 50M+       │ CORE, Europe PMC, ArXiv           │
│  Embeddings sémantiques       │ 200M+      │ Semantic Scholar (SPECTER)        │
│  Résumés IA (TL;DR)           │ 200M+      │ Semantic Scholar                  │
│  Annotations text-mining      │ 35M+       │ Europe PMC                        │
│  Données de financement       │ 20M+       │ OpenAlex, Crossref                │
│                                                                                 │
│  ───────────────────────────────────────────────────────────────────────────   │
│                                                                                 │
│  DOMAINES SPÉCIALISÉS         │            │                                   │
│  ───────────────────────────────────────────────────────────────────────────   │
│  Biomédical                   │ 40M+       │ PubMed, Europe PMC, bioRxiv       │
│  Informatique                 │ 6M+        │ DBLP, Semantic Scholar            │
│  Preprints                    │ 500k+      │ ArXiv, bioRxiv, medRxiv           │
│  Données de recherche         │ 50M+       │ DataCite, Zenodo                  │
│  France/HAL                   │ 4M+        │ HAL                               │
│  Open Access exclusif         │ 9M+        │ DOAJ                              │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implémentation recommandée

### Ordre d'implémentation des sources

| Phase | Sources | Justification |
|-------|---------|---------------|
| **1** | OpenAlex, Crossref, HAL, ArXiv, ORCID | Base solide, déjà planifiées |
| **2** | Semantic Scholar, Unpaywall, OpenCitations | Enrichissement (citations, OA, embeddings) |
| **3** | PubMed, Europe PMC | Biomédical |
| **4** | CORE, DataCite, Zenodo, DOAJ | Compléments (texte, données, OA) |
| **5** | DBLP, bioRxiv/medRxiv | Domaines spécialisés |

### Configuration recommandée par cas d'usage

```typescript
// Recherche généraliste
const generalClient = createCitationsClient({
  defaultSources: ['openalex', 'crossref'],
  parallelRequests: true,
});

// Recherche biomédicale
const biomedClient = createCitationsClient({
  defaultSources: ['pubmed', 'europepmc', 'biorxiv'],
  parallelRequests: true,
});

// Recherche avec enrichissement OA
const oaClient = createCitationsClient({
  defaultSources: ['openalex', 'crossref'],
  enrichWith: ['unpaywall'],  // Enrichit les résultats avec URLs OA
  parallelRequests: true,
});

// Recherche avec graphe de citations
const citationsClient = createCitationsClient({
  defaultSources: ['openalex', 'semanticscholar'],
  includeCitations: true,
  includeReferences: true,
});

// Recherche France/institutionnelle
const frenchClient = createCitationsClient({
  defaultSources: ['hal', 'openalex'],
  filterCountry: 'FR',
});
```

---

## Fichiers associés

- **Spec OpenAPI** : `packages/citations/specs/citations.yaml`
- **Types TypeScript** : `packages/citations/src/entities/*.ts`
- **Adaptateurs** : `packages/citations/src/adapters/*.ts`
- **Documentation entités** : [Référence des entités par source](./sources/entities-reference.md)
- **Catalogue des sources** : [Catalogue complet](./sources/catalog.md)
