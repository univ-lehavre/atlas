# Researcher Profile and Career Reconstruction

This document describes how to reconstruct a researcher's career path (affiliations, expertise, collaborations) from bibliographic sources, and how to validate this information.

> **See also:**
> - [Author Verification](./author-verification.md) - Publication validation
> - [Unified Schema](./unified-schema.md) - Work, Author, Institution entities
> - [Source Catalog](./sources/catalog.md) - Detail of available data by source
>
> **User documentation:**
> - [Manage Your Career](../user/manage-career.md) - Guide for researchers
> - [Expertise Profile](../user/expertise-profile.md) - Your research domains
> - [Collaboration Network](../user/collaboration-network.md) - Your co-authors

---

## Problem Statement

Reconstructing a researcher's career path is complex because:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CAREER RECONSTRUCTION CHALLENGES                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FRAGMENTED DATA                       TEMPORAL INCONSISTENCIES             │
│  ──────────────────                    ────────────────────────             │
│  • Affiliations in each source         • Missing start/end dates           │
│  • Different formats                   • Inconsistent overlaps             │
│  • Variable granularity                • Approximate years                 │
│  • Incompatible identifiers            • Untracked mobility                │
│                                                                              │
│  ORGANIZATION AMBIGUITY                EXPERTISE EVOLUTION                  │
│  ────────────────────────              ─────────────────────                │
│  • University renamings                • Topics evolve over time           │
│  • Laboratory mergers                  • New disciplines                   │
│  • Multiple affiliations               • Growing interdisciplinarity       │
│  • Complex hierarchies                 • Specialization vs generalization  │
│                                                                              │
│  EXAMPLE: Dr. Marie Dupont                                                  │
│  ─────────────────────────────────────────────────────────────────          │
│  OpenAlex: "Universite Paris-Saclay" (2020-present)                         │
│  Crossref: "CEA Saclay" (position = 1 on 2021 article)                      │
│  HAL:      "LSCE, CEA/CNRS/UVSQ" (research structure)                       │
│  ORCID:    "CEA" (employment 2018-present)                                  │
│            "Universite Paris-Sud" (education 2014-2017)                     │
│  -> 4 different representations of the same reality                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Affiliation Data by Source

### Availability Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                     AFFILIATIONS - AVAILABILITY BY SOURCE                                   │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  FIELD                     │ OA  │ CR  │ HAL │ ORC │ S2  │ PM  │ DBL │ SCOPUS │             │
│  ──────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼────────┼             │
│  Institution name          │ ✅  │ ✅  │ ✅  │ ✅  │ ✅  │ ✅  │ ⚠️  │ ✅     │             │
│  ROR ID                    │ ✅  │ ⚠️  │ ❌  │ ⚠️  │ ❌  │ ❌  │ ❌  │ ❌     │             │
│  Internal identifier       │ ✅  │ ❌  │ ✅  │ ❌  │ ❌  │ ❌  │ ❌  │ ✅     │             │
│  Country                   │ ✅  │ ⚠️  │ ✅  │ ✅  │ ⚠️  │ ✅  │ ⚠️  │ ✅     │             │
│  City                      │ ⚠️  │ ⚠️  │ ⚠️  │ ⚠️  │ ❌  │ ⚠️  │ ❌  │ ⚠️     │             │
│  GPS coordinates           │ ⚠️  │ ❌  │ ❌  │ ❌  │ ❌  │ ❌  │ ❌  │ ❌     │             │
│  Type (univ/lab/etc)       │ ✅  │ ❌  │ ✅  │ ✅  │ ❌  │ ❌  │ ❌  │ ✅     │             │
│  Hierarchy                 │ ⚠️  │ ❌  │ ✅  │ ❌  │ ❌  │ ❌  │ ❌  │ ⚠️     │             │
│  Start date                │ ⚠️  │ ❌  │ ❌  │ ✅  │ ❌  │ ❌  │ ❌  │ ❌     │             │
│  End date                  │ ⚠️  │ ❌  │ ❌  │ ✅  │ ❌  │ ❌  │ ❌  │ ❌     │             │
│  Role/Title                │ ❌  │ ❌  │ ❌  │ ✅  │ ❌  │ ❌  │ ❌  │ ❌     │             │
│  Department                │ ⚠️  │ ⚠️  │ ✅  │ ⚠️  │ ❌  │ ❌  │ ❌  │ ⚠️     │             │
│                                                                                             │
│  LEGEND: ✅ Available  ⚠️ Partial  ❌ Not available                                        │
│                                                                                             │
│  OA=OpenAlex, CR=Crossref, HAL, ORC=ORCID, S2=SemanticScholar, PM=PubMed, DBL=DBLP        │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Detail by Source

#### OpenAlex

```typescript
// OpenAlex affiliations structure (Author entity)
interface OpenAlexAuthorAffiliation {
  institution: {
    id: string;                    // "I27837315"
    ror: string;                   // "https://ror.org/00f54p054"
    display_name: string;          // "Stanford University"
    country_code: string;          // "US"
    type: string;                  // "education" | "facility" | "company" | ...
    lineage: string[];             // Hierarchy ["I27837315", "I154495582"]
  };
  years: number[];                 // [2018, 2019, 2020, 2021]
}

// On Works (authorships)
interface OpenAlexAuthorship {
  author: { id: string; display_name: string; orcid?: string };
  institutions: Array<{
    id: string;
    display_name: string;
    ror: string;
    country_code: string;
    type: string;
  }>;
  raw_affiliation_strings: string[];  // Original raw text
}
```

**OpenAlex strengths:**
- Systematic ROR (90%+ of institutions)
- Years of presence deduced from publications
- Geolocation via ROR
- Institutional hierarchy (lineage)

**Limitations:**
- No precise dates (start/end)
- No role/title
- Algorithmic deduction (may contain errors)

#### ORCID

```typescript
// ORCID structure - Employments
interface OrcidEmployment {
  organization: {
    name: string;                           // "Stanford University"
    address: {
      city: string;                         // "Stanford"
      region?: string;                      // "California"
      country: string;                      // "US"
    };
    disambiguated_organization?: {
      disambiguated_organization_identifier: string;  // ROR, GRID, etc.
      disambiguation_source: string;        // "ROR", "GRID", "RINGGOLD"
    };
  };
  department_name?: string;                 // "Computer Science"
  role_title?: string;                      // "Associate Professor"
  start_date: { year: number; month?: number; day?: number };
  end_date?: { year: number; month?: number; day?: number };
  source: {
    source_name: string;                    // "Stanford University" or author
    assertion_origin_name?: string;
  };
}

// ORCID structure - Education
interface OrcidEducation {
  organization: { /* same as employment */ };
  department_name?: string;
  role_title?: string;                      // "PhD", "MSc", "BSc"
  start_date: { year: number; month?: number; day?: number };
  end_date?: { year: number; month?: number; day?: number };
}
```

**ORCID strengths:**
- Precise dates (month, sometimes day)
- Explicit role and title
- Employment/education distinction
- Declarative data (source of truth for the author)
- Assertion source (self-declared vs institution)

**Limitations:**
- No systematic ROR (RINGGOLD, GRID sometimes)
- Variable completeness (depends on author)
- No systematic validation

#### HAL

```typescript
// HAL structure - Affiliations on documents
interface HalAffiliation {
  structId_i: number;                       // HAL structure ID
  structName_s: string;                     // "Laboratoire des Sciences du Climat"
  structAcronym_s?: string;                 // "LSCE"
  structType_s: string;                     // "laboratory", "institution", "department"
  structCountry_s: string;                  // "fr"
  structAddress_s?: string;

  // Hierarchy
  structParent_i?: number[];                // Parent structure IDs
  structParentName_s?: string[];            // ["CEA", "CNRS", "UVSQ"]

  // Supervising bodies
  structTutelles_s?: string[];              // ["CEA", "CNRS", "UVSQ"]
}

// AureHAL referential (structures)
interface HalStructure {
  docid: number;
  label_s: string;
  acronym_s?: string;
  type_s: string;
  parentDocid_i?: number[];
  address_s?: string;
  country_s: string;
  url_s?: string;
  rnsr_s?: string;                          // RNSR code (national directory)
  idRef_s?: string;                         // IdRef ABES
  isni_s?: string;                          // ISNI
}
```

**HAL strengths:**
- Detailed hierarchy (lab -> department -> university)
- Multiple supervising bodies (CNRS + University)
- Structured referential (AureHAL)
- National codes (RNSR, IdRef)
- Specific to French research

**Limitations:**
- No native ROR
- No presence dates
- Mainly France

#### Crossref

```typescript
// Crossref structure - Affiliations on Works
interface CrossrefAuthor {
  given?: string;
  family: string;
  sequence: string;                         // "first", "additional"
  affiliation: Array<{
    name: string;                           // Raw text only
  }>;
  ORCID?: string;
}
```

**Crossref strengths:**
- Massive worldwide coverage
- Affiliation at publication time
- Original raw text from publisher

**Limitations:**
- Unstructured raw text
- No identifiers (ROR adoption in progress)
- Variable quality depending on publishers

---

## Affiliation Path Reconstruction

### Merging Algorithm

```typescript
interface AffiliationTimeline {
  segments: AffiliationSegment[];
  gaps: TimeGap[];
  conflicts: AffiliationConflict[];
}

interface AffiliationSegment {
  institution: ResolvedInstitution;
  startDate: PartialDate;
  endDate?: PartialDate;
  confidence: number;                       // 0.0 - 1.0
  sources: AffiliationSource[];
  role?: string;
  department?: string;
}

interface PartialDate {
  year: number;
  month?: number;
  day?: number;
  precision: 'day' | 'month' | 'year' | 'approximate';
}

interface AffiliationSource {
  source: SourceType;
  rawAffiliation: string;
  resolvedInstitutionId?: string;
  evidence: 'declaration' | 'publication' | 'inferred';
}

interface AffiliationConflict {
  type: 'overlap' | 'gap' | 'inconsistent_institution' | 'date_mismatch';
  segments: AffiliationSegment[];
  suggestedResolution?: AffiliationSegment;
}
```

### Reconstruction Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AFFILIATION PATH RECONSTRUCTION                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. COLLECTION                                                               │
│  ─────────────                                                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ ORCID   │  │OpenAlex │  │   HAL   │  │Crossref │  │ Scopus  │          │
│  │ (decl.) │  │(infer.) │  │(struct.)│  │ (raw)   │  │(struct.)│          │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘          │
│       │            │            │            │            │                 │
│       └────────────┴────────────┴────────────┴────────────┘                 │
│                                  │                                           │
│  2. NORMALIZATION                ▼                                           │
│  ─────────────────  ┌───────────────────────┐                               │
│                     │  Institution Resolver │                               │
│                     │  - ROR matching       │                               │
│                     │  - Name normalization │                               │
│                     │  - Hierarchy mapping  │                               │
│                     └───────────┬───────────┘                               │
│                                 │                                            │
│  3. ALIGNMENT                   ▼                                            │
│  ──────────────    ┌────────────────────────┐                               │
│                    │   Timeline Builder     │                               │
│                    │   - Date alignment     │                               │
│                    │   - Gap detection      │                               │
│                    │   - Overlap resolution │                               │
│                    └───────────┬────────────┘                               │
│                                │                                             │
│  4. RESOLUTION                 ▼                                             │
│  ──────────────   ┌─────────────────────────┐                               │
│                   │   Conflict Resolver     │                               │
│                   │   - Priority rules      │                               │
│                   │   - Confidence scoring  │                               │
│                   │   - Manual flags        │                               │
│                   └───────────┬─────────────┘                               │
│                               │                                              │
│  5. VALIDATION                ▼                                              │
│  ──────────────   ┌─────────────────────────┐                               │
│                   │   User Verification     │                               │
│                   │   - Timeline review     │                               │
│                   │   - Conflict resolution │                               │
│                   │   - Gap filling         │                               │
│                   └─────────────────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Priority Rules

```typescript
const affiliationPriorityRules: PriorityRule[] = [
  // 1. ORCID declared by author = source of truth
  {
    condition: (s) => s.source === 'orcid' && s.evidence === 'declaration',
    priority: 100,
    confidence: 0.95,
  },

  // 2. ORCID added by institution
  {
    condition: (s) => s.source === 'orcid' && s.sourceAssertion === 'institution',
    priority: 90,
    confidence: 0.90,
  },

  // 3. HAL with validated structure
  {
    condition: (s) => s.source === 'hal' && s.structureValidated,
    priority: 80,
    confidence: 0.85,
  },

  // 4. OpenAlex with resolved ROR
  {
    condition: (s) => s.source === 'openalex' && s.rorId,
    priority: 70,
    confidence: 0.80,
  },

  // 5. Crossref/others with raw text
  {
    condition: (s) => !s.resolvedInstitutionId,
    priority: 30,
    confidence: 0.50,
  },
];

// Date conflict resolution
const resolveDateConflict = (
  segment1: AffiliationSegment,
  segment2: AffiliationSegment
): AffiliationSegment => {
  // ORCID has priority on dates
  if (segment1.sources.some(s => s.source === 'orcid')) {
    return { ...segment1, sources: [...segment1.sources, ...segment2.sources] };
  }

  // Otherwise, use finest precision
  if (segment1.startDate.precision < segment2.startDate.precision) {
    return { ...segment1, startDate: segment2.startDate };
  }

  return segment1;
};
```

---

## Expert Profile Construction

### Data Sources for Expertise

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATA SOURCES FOR EXPERTISE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SOURCE              DATA                       QUALITY    GRANULARITY      │
│  ────────────────────────────────────────────────────────────────────       │
│                                                                              │
│  OpenAlex Topics     • Hierarchical concepts    *****      Very fine        │
│                      • 65k+ topics              (ML-based)  (4 levels)      │
│                      • Score per publication                                 │
│                      • Temporal evolution                                    │
│                                                                              │
│  Keywords (sources)  • Author keywords          ***        Variable         │
│                      • Publisher keywords                  (free-form)       │
│                      • Subject headings                                      │
│                                                                              │
│  Abstract analysis   • NLP on abstracts         ****       Fine             │
│                      • Entity extraction                   (custom)          │
│                      • Thematic clustering                                   │
│                                                                              │
│  Full-text analysis  • NLP on full text         *****      Very fine        │
│                      • Methodologies                       (if available)    │
│                      • Techniques used                                       │
│                                                                              │
│  Received citations  • Who cites the author?    ****       Indirect         │
│                      • In what context?                    (influence)       │
│                                                                              │
│  External            • CCS (Computer Science)   ****       Standardized     │
│  classifications     • MeSH (Medicine)                     (domain)          │
│                      • JEL (Economics)                                       │
│                      • PACS (Physics)                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Construction Approaches

#### 1. OpenAlex Topics (recommended)

```typescript
interface OpenAlexTopic {
  id: string;                               // "T12345"
  display_name: string;                     // "Machine Learning"
  subfield: { id: string; display_name: string };
  field: { id: string; display_name: string };
  domain: { id: string; display_name: string };
}

interface WorkTopic {
  topic: OpenAlexTopic;
  score: number;                            // 0.0 - 1.0
}

// Expertise profile from OpenAlex topics
const buildExpertiseFromTopics = (
  works: Work[],
  options: { minScore?: number; minWorks?: number }
): ExpertiseDomain[] => {
  const topicStats = new Map<string, TopicStats>();

  for (const work of works) {
    const year = work.year;
    for (const wt of work.topics) {
      if (wt.score < (options.minScore ?? 0.5)) continue;

      const stats = topicStats.get(wt.topic.id) ?? {
        topic: wt.topic,
        works: [],
        totalScore: 0,
        yearRange: { min: year, max: year },
      };

      stats.works.push(work.id);
      stats.totalScore += wt.score;
      stats.yearRange.min = Math.min(stats.yearRange.min, year);
      stats.yearRange.max = Math.max(stats.yearRange.max, year);

      topicStats.set(wt.topic.id, stats);
    }
  }

  // Filter and score
  return Array.from(topicStats.values())
    .filter(s => s.works.length >= (options.minWorks ?? 2))
    .map(s => ({
      topic: s.topic,
      level: calculateExpertiseLevel(s),
      publications: s.works.length,
      activeYears: s.yearRange,
      averageScore: s.totalScore / s.works.length,
    }))
    .sort((a, b) => b.publications - a.publications);
};

type ExpertiseLevel = 'emerging' | 'developing' | 'established' | 'leading';

const calculateExpertiseLevel = (stats: TopicStats): ExpertiseLevel => {
  const { works, totalScore, yearRange } = stats;
  const duration = yearRange.max - yearRange.min + 1;
  const avgScore = totalScore / works.length;

  if (works.length >= 10 && duration >= 5 && avgScore > 0.7) return 'leading';
  if (works.length >= 5 && duration >= 3 && avgScore > 0.6) return 'established';
  if (works.length >= 2 && avgScore > 0.5) return 'developing';
  return 'emerging';
};
```

#### 2. Text Analysis (Abstract/Full-text)

```typescript
interface TextAnalysisConfig {
  useAbstract: boolean;
  useFullText: boolean;                     // If available (HAL, ArXiv, etc.)
  extractionMethods: ExtractionMethod[];
}

type ExtractionMethod =
  | 'keyword_extraction'                    // TF-IDF, RAKE, YAKE
  | 'named_entity_recognition'              // SpaCy, Stanza
  | 'topic_modeling'                        // LDA, BERTopic
  | 'embedding_clustering'                  // SPECTER, SciBERT
  | 'methodology_detection';                // Specific patterns

// Example with BERTopic
const analyzeTextsWithBERTopic = async (
  texts: string[]
): Promise<TopicCluster[]> => {
  // Embeddings with SPECTER (specialized for scientific publications)
  const embeddings = await generateEmbeddings(texts, 'allenai/specter2');

  // Clustering and topic extraction
  const clusters = await clusterWithHDBSCAN(embeddings);

  // Topic representation
  return clusters.map(cluster => ({
    id: cluster.id,
    keywords: extractKeywordsFromCluster(cluster, texts),
    representativeWorks: cluster.indices.slice(0, 5),
    size: cluster.indices.length,
    coherence: cluster.coherenceScore,
  }));
};

// Methodology extraction
const extractMethodologies = (fullText: string): Methodology[] => {
  const patterns = [
    { type: 'statistical', regex: /(?:regression|ANOVA|t-test|chi-square)/gi },
    { type: 'ml', regex: /(?:neural network|deep learning|random forest|SVM)/gi },
    { type: 'qualitative', regex: /(?:interview|ethnograph|grounded theory)/gi },
    { type: 'experimental', regex: /(?:randomized|control group|placebo)/gi },
  ];

  return patterns
    .map(p => ({ type: p.type, matches: fullText.match(p.regex) ?? [] }))
    .filter(m => m.matches.length > 0);
};
```

#### 3. Received Citation Analysis

```typescript
interface CitationContext {
  citingWork: Work;
  context: string;                          // Citation sentence/paragraph
  sentiment: 'positive' | 'neutral' | 'negative' | 'critical';
  purpose: CitationPurpose;
}

type CitationPurpose =
  | 'background'                            // General context
  | 'method_use'                            // Uses the method
  | 'comparison'                            // Compares results
  | 'extension'                             // Extends the work
  | 'critique';                             // Critiques/refutes

// Impact by domain
const analyzeInfluenceByDomain = (
  authorWorks: Work[],
  citations: CitationContext[]
): DomainInfluence[] => {
  const influenceByDomain = new Map<string, DomainStats>();

  for (const citation of citations) {
    // Domain of citing work
    const citingDomain = citation.citingWork.topics[0]?.topic.domain;
    if (!citingDomain) continue;

    const stats = influenceByDomain.get(citingDomain.id) ?? {
      domain: citingDomain,
      citations: 0,
      purposeBreakdown: {},
    };

    stats.citations++;
    stats.purposeBreakdown[citation.purpose] =
      (stats.purposeBreakdown[citation.purpose] ?? 0) + 1;

    influenceByDomain.set(citingDomain.id, stats);
  }

  return Array.from(influenceByDomain.values())
    .sort((a, b) => b.citations - a.citations);
};
```

### Multi-source Combination

```typescript
interface ExpertProfile {
  // Identity
  authorId: string;
  displayName: string;

  // Expertise domains (aggregated)
  domains: ExpertiseDomain[];

  // Expertise timeline
  expertiseTimeline: ExpertiseTimepoint[];

  // Metrics
  metrics: ExpertiseMetrics;

  // Collaborations
  collaborationNetwork: CollaborationStats;

  // Confidence and sources
  confidence: number;
  dataCompleteness: DataCompleteness;
}

interface ExpertiseDomain {
  // Identification
  id: string;
  name: string;
  hierarchy: string[];                      // ["Computer Science", "AI", "NLP"]

  // Expertise level
  level: ExpertiseLevel;
  score: number;                            // 0.0 - 1.0

  // Evidence
  evidence: {
    publications: number;
    citations: number;
    hIndexInDomain?: number;
    firstPublicationYear: number;
    lastPublicationYear: number;
  };

  // Evaluation sources
  sources: {
    openalex_topics?: { count: number; avgScore: number };
    keywords?: { count: number; sources: string[] };
    text_analysis?: { method: string; confidence: number };
    citations?: { inDomainCitations: number };
  };
}

// Merging expertise from different sources
const fuseExpertiseSources = (
  openalexTopics: TopicStats[],
  extractedKeywords: KeywordStats[],
  textAnalysis: TopicCluster[],
  citationAnalysis: DomainInfluence[]
): ExpertiseDomain[] => {
  const unified = new Map<string, ExpertiseDomain>();

  // 1. Base: OpenAlex Topics (most reliable)
  for (const topic of openalexTopics) {
    const domain = createDomainFromTopic(topic);
    domain.sources.openalex_topics = {
      count: topic.works.length,
      avgScore: topic.totalScore / topic.works.length,
    };
    unified.set(domain.id, domain);
  }

  // 2. Enrich with keywords
  for (const kw of extractedKeywords) {
    const matchedDomain = findMatchingDomain(kw.keyword, unified);
    if (matchedDomain) {
      matchedDomain.sources.keywords = {
        count: kw.count,
        sources: kw.sources,
      };
      matchedDomain.score = weightedAverage(
        matchedDomain.score, 0.7,
        normalizeKeywordScore(kw), 0.3
      );
    }
  }

  // 3. Enrich with text analysis
  for (const cluster of textAnalysis) {
    const matchedDomain = findMatchingDomainByKeywords(cluster.keywords, unified);
    if (matchedDomain) {
      matchedDomain.sources.text_analysis = {
        method: 'bertopic',
        confidence: cluster.coherence,
      };
    }
  }

  // 4. Enrich with citations
  for (const influence of citationAnalysis) {
    const matchedDomain = findMatchingDomainByName(influence.domain.display_name, unified);
    if (matchedDomain) {
      matchedDomain.sources.citations = {
        inDomainCitations: influence.citations,
      };
      matchedDomain.evidence.citations = influence.citations;
    }
  }

  return Array.from(unified.values())
    .map(d => ({ ...d, level: recalculateLevel(d) }))
    .sort((a, b) => b.score - a.score);
};
```

---

## Temporal Expertise Analysis

### Expertise Timeline

```typescript
interface ExpertiseTimepoint {
  year: number;
  domains: Array<{
    domain: ExpertiseDomain;
    publicationsThisYear: number;
    cumulativePublications: number;
    citationsThisYear: number;
  }>;
  emergingTopics: string[];
  decliningTopics: string[];
  shifts: ExpertiseShift[];
}

interface ExpertiseShift {
  type: 'emergence' | 'growth' | 'plateau' | 'decline' | 'pivot';
  from?: ExpertiseDomain;
  to?: ExpertiseDomain;
  year: number;
  confidence: number;
}

// Building the timeline
const buildExpertiseTimeline = (
  works: Work[],
  minYear: number,
  maxYear: number
): ExpertiseTimepoint[] => {
  const timeline: ExpertiseTimepoint[] = [];
  const cumulativeByDomain = new Map<string, number>();

  for (let year = minYear; year <= maxYear; year++) {
    const yearWorks = works.filter(w => w.year === year);
    const domainStats = new Map<string, DomainYearStats>();

    // Count publications by domain this year
    for (const work of yearWorks) {
      for (const topic of work.topics) {
        const domainId = topic.topic.domain.id;
        const stats = domainStats.get(domainId) ?? {
          domain: topic.topic.domain,
          publicationsThisYear: 0,
          citations: 0,
        };
        stats.publicationsThisYear++;
        stats.citations += work.citationCount ?? 0;
        domainStats.set(domainId, stats);
      }
    }

    // Update cumulatives
    for (const [domainId, stats] of domainStats) {
      const cumulative = (cumulativeByDomain.get(domainId) ?? 0) + stats.publicationsThisYear;
      cumulativeByDomain.set(domainId, cumulative);
    }

    // Detect changes
    const previous = timeline[timeline.length - 1];
    const shifts = detectShifts(previous, domainStats, cumulativeByDomain);

    timeline.push({
      year,
      domains: Array.from(domainStats.values()).map(s => ({
        domain: s.domain,
        publicationsThisYear: s.publicationsThisYear,
        cumulativePublications: cumulativeByDomain.get(s.domain.id) ?? 0,
        citationsThisYear: s.citations,
      })),
      emergingTopics: shifts.filter(s => s.type === 'emergence').map(s => s.to!.name),
      decliningTopics: shifts.filter(s => s.type === 'decline').map(s => s.from!.name),
      shifts,
    });
  }

  return timeline;
};

// Thematic pivot detection
const detectShifts = (
  previous: ExpertiseTimepoint | undefined,
  current: Map<string, DomainYearStats>,
  cumulative: Map<string, number>
): ExpertiseShift[] => {
  const shifts: ExpertiseShift[] = [];

  if (!previous) return shifts;

  const prevDomains = new Set(previous.domains.map(d => d.domain.id));
  const currDomains = new Set(current.keys());

  // New domains (emergence)
  for (const domainId of currDomains) {
    if (!prevDomains.has(domainId) && (current.get(domainId)?.publicationsThisYear ?? 0) >= 2) {
      shifts.push({
        type: 'emergence',
        to: current.get(domainId)!.domain,
        year: /* current year */,
        confidence: 0.7,
      });
    }
  }

  // Disappeared domains (decline)
  for (const domainId of prevDomains) {
    const prevCount = previous.domains.find(d => d.domain.id === domainId)?.publicationsThisYear ?? 0;
    const currCount = current.get(domainId)?.publicationsThisYear ?? 0;

    if (prevCount >= 2 && currCount === 0) {
      shifts.push({
        type: 'decline',
        from: previous.domains.find(d => d.domain.id === domainId)!.domain,
        year: /* current year */,
        confidence: 0.6,
      });
    }
  }

  return shifts;
};
```

### Temporal Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXPERTISE TIMELINE - Dr. Marie Dupont                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  2015      2016      2017      2018      2019      2020      2021      2022 │
│    │         │         │         │         │         │         │         │  │
│    │         │         │         │         │         │         │         │  │
│  ██████    █████    ██████    ████      ███        ██                      │  │
│  NLP       NLP      NLP       NLP      NLP       NLP      Emergence ->      │
│                                                            Climate NLP      │
│            ████     ███████   ████████ █████████ ████████ ███████████████ │
│            Deep     Deep      Deep     Deep      Deep     Deep Learning    │
│            Learn.   Learn.    Learn.   Learn.    Learn.                    │
│                                                                              │
│                               ████     ██████    █████████ ████████████   │
│                               Climate  Climate   Climate   Climate Science │
│                               Science  Science   Science                    │
│                                                                              │
│  DETECTED SHIFTS:                                                           │
│  ─────────────────                                                          │
│  2017: Emergence "Deep Learning" (methodological pivot)                     │
│  2018: Emergence "Climate Science" (new application domain)                 │
│  2021: Emergence "Climate NLP" (convergence of 2 expertises)                │
│                                                                              │
│  INTERPRETATION:                                                            │
│  ────────────────                                                           │
│  Evolution from traditional NLP expertise towards interdisciplinary         │
│  application combining AI and climate science.                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Collaboration Analysis

### Co-author Network Extraction

```typescript
interface CollaborationNetwork {
  nodes: CollaboratorNode[];
  edges: CollaborationEdge[];
  metrics: NetworkMetrics;
  communities: Community[];
}

interface CollaboratorNode {
  authorId: string;
  name: string;
  institution?: ResolvedInstitution;
  orcid?: string;

  // Local metrics
  collaborationCount: number;
  firstCollabYear: number;
  lastCollabYear: number;
  sharedTopics: string[];
}

interface CollaborationEdge {
  source: string;                           // authorId
  target: string;                           // authorId
  weight: number;                           // Number of co-publications
  years: number[];                          // Collaboration years
  works: string[];                          // Common publication IDs
  type: CollaborationType;
}

type CollaborationType =
  | 'institutional'                         // Same institution
  | 'national'                              // Same country
  | 'international'                         // Different countries
  | 'interdisciplinary';                    // Different domains

interface NetworkMetrics {
  totalCollaborators: number;
  averageCollaboratorsPerPaper: number;
  internationalCollaborationRate: number;
  interdisciplinaryRate: number;
  networkDensity: number;
  clusteringCoefficient: number;
}

// Building the network
const buildCollaborationNetwork = (
  authorId: string,
  works: Work[]
): CollaborationNetwork => {
  const nodes = new Map<string, CollaboratorNode>();
  const edges = new Map<string, CollaborationEdge>();

  for (const work of works) {
    const coauthors = work.authors.filter(a => a.authorId !== authorId);

    for (const coauthor of coauthors) {
      // Node
      const node = nodes.get(coauthor.authorId) ?? {
        authorId: coauthor.authorId,
        name: coauthor.displayName,
        institution: coauthor.institutions?.[0],
        orcid: coauthor.orcid,
        collaborationCount: 0,
        firstCollabYear: work.year,
        lastCollabYear: work.year,
        sharedTopics: [],
      };
      node.collaborationCount++;
      node.firstCollabYear = Math.min(node.firstCollabYear, work.year);
      node.lastCollabYear = Math.max(node.lastCollabYear, work.year);
      node.sharedTopics = [...new Set([...node.sharedTopics, ...work.topics.map(t => t.topic.id)])];
      nodes.set(coauthor.authorId, node);

      // Edge
      const edgeKey = [authorId, coauthor.authorId].sort().join('-');
      const edge = edges.get(edgeKey) ?? {
        source: authorId,
        target: coauthor.authorId,
        weight: 0,
        years: [],
        works: [],
        type: determineCollaborationType(/* ... */),
      };
      edge.weight++;
      edge.years.push(work.year);
      edge.works.push(work.id);
      edges.set(edgeKey, edge);
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
    metrics: calculateNetworkMetrics(nodes, edges),
    communities: detectCommunities(nodes, edges),
  };
};
```

### Temporal Collaboration Evolution

```typescript
interface CollaborationTimeline {
  years: CollaborationYearStats[];
  trends: CollaborationTrend[];
}

interface CollaborationYearStats {
  year: number;
  newCollaborators: number;
  recurringCollaborators: number;
  institutionalCollabs: number;
  internationalCollabs: number;
  topCollaborators: Array<{ authorId: string; name: string; count: number }>;
}

interface CollaborationTrend {
  type: 'expansion' | 'consolidation' | 'internationalization' | 'institutionalization';
  startYear: number;
  endYear: number;
  description: string;
  evidence: string[];
}

// Collaboration pattern analysis
const analyzeCollaborationPatterns = (
  network: CollaborationNetwork,
  works: Work[]
): CollaborationPattern[] => {
  const patterns: CollaborationPattern[] = [];

  // 1. Recurring collaborators (stable team)
  const recurring = network.nodes.filter(n => n.collaborationCount >= 3);
  if (recurring.length >= 3) {
    patterns.push({
      type: 'stable_team',
      description: `Stable team of ${recurring.length} recurring collaborators`,
      members: recurring.map(n => n.name),
      period: { start: Math.min(...recurring.map(n => n.firstCollabYear)), end: /* now */ },
    });
  }

  // 2. Collaboration hub
  const highDegreeNodes = network.nodes.filter(n => n.collaborationCount >= 5);
  for (const hub of highDegreeNodes) {
    patterns.push({
      type: 'collaboration_hub',
      description: `Intensive collaboration with ${hub.name}`,
      evidence: `${hub.collaborationCount} joint publications`,
    });
  }

  // 3. Growing internationalization
  const intlByYear = calculateInternationalRateByYear(network, works);
  if (isIncreasingTrend(intlByYear)) {
    patterns.push({
      type: 'internationalization',
      description: 'Growing internationalization of collaborations',
      trend: intlByYear,
    });
  }

  return patterns;
};
```

---

## User Validation

### Career Review Interface

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CAREER VALIDATION - Dr. Marie Dupont                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║  RECONSTRUCTED AFFILIATIONS                                            ║  │
│  ╠═══════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                         ║  │
│  ║  2018-present   CEA Saclay - LSCE                           [✓] [✗]   ║  │
│  ║                 Sources: ORCID ✓, HAL ✓, OpenAlex ✓                    ║  │
│  ║                 Confidence: 95%                                          ║  │
│  ║                                                                         ║  │
│  ║  2014-2017      Universite Paris-Sud                        [✓] [✗]   ║  │
│  ║                 PhD in Physics                                          ║  │
│  ║                 Sources: ORCID ✓                                        ║  │
│  ║                 Confidence: 90%                                          ║  │
│  ║                                                                         ║  │
│  ║  ⚠️ GAP DETECTED: 2017-2018 (postdoc?)                      [Complete] ║  │
│  ║                                                                         ║  │
│  ║  [+ Add missing affiliation]                                           ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║  DETECTED EXPERTISE                                                    ║  │
│  ╠═══════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                         ║  │
│  ║  *****  Climate Modeling (Leading)                          [✓] [✗]   ║  │
│  ║              15 publications, 2015-2023                                ║  │
│  ║              Sources: OpenAlex Topics, HAL Keywords                     ║  │
│  ║                                                                         ║  │
│  ║  ****   Machine Learning (Established)                      [✓] [✗]   ║  │
│  ║              8 publications, 2019-2023                                 ║  │
│  ║              Sources: OpenAlex Topics, Abstract NLP                     ║  │
│  ║                                                                         ║  │
│  ║  ***    Carbon Cycle (Developing)                           [✓] [✗]   ║  │
│  ║              4 publications, 2021-2023                                 ║  │
│  ║              ⚠️ Medium confidence - Do you want to confirm?            ║  │
│  ║                                                                         ║  │
│  ║  **     Remote Sensing (Emerging)                           [✓] [✗]   ║  │
│  ║              2 publications, 2022-2023                                 ║  │
│  ║                                                                         ║  │
│  ║  [+ Add undetected expertise]                                          ║  │
│  ║  [↻ Recalculate with new criteria]                                     ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║  KEY COLLABORATIONS                                                    ║  │
│  ╠═══════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                         ║  │
│  ║  Dr. Jean Martin (CNRS)          12 pubs, 2016-2023         [✓] [✗]   ║  │
│  ║  Prof. Anna Schmidt (ETH)         8 pubs, 2019-2023         [✓] [✗]   ║  │
│  ║  Dr. Li Wei (Tsinghua)            5 pubs, 2021-2023         [✓] [✗]   ║  │
│  ║                                                                         ║  │
│  ║  ⚠️ "M. Dupont" in 3 articles - Is this you?                [Verify]  ║  │
│  ║                                                                         ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│                        [Save validations]                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Model for Validation

```typescript
// Extension of author-verification.md model

interface ProfileValidation {
  profileId: string;

  // Affiliation validations
  affiliationValidations: AffiliationValidation[];

  // Expertise validations
  expertiseValidations: ExpertiseValidation[];

  // Collaboration validations
  collaborationValidations: CollaborationValidation[];

  // Metadata
  lastValidatedAt: Date;
  completenessScore: number;
}

interface AffiliationValidation {
  id: string;
  segmentId: string;                        // Reference to AffiliationSegment

  decision: 'confirmed' | 'rejected' | 'modified' | 'pending';

  // If modified
  corrections?: {
    institution?: string;
    startDate?: PartialDate;
    endDate?: PartialDate;
    role?: string;
    department?: string;
  };

  notes?: string;
  validatedAt: Date;
}

interface ExpertiseValidation {
  id: string;
  domainId: string;                         // Reference to ExpertiseDomain

  decision: 'confirmed' | 'rejected' | 'adjusted' | 'pending';

  // If adjusted
  adjustments?: {
    level?: ExpertiseLevel;
    customName?: string;                    // Domain renaming
    subdomains?: string[];                  // Clarifications
  };

  // Self-declared expertise (not detected)
  selfDeclared?: boolean;

  notes?: string;
  validatedAt: Date;
}

interface CollaborationValidation {
  id: string;
  collaboratorId: string;                   // Co-author AuthorId

  decision: 'confirmed' | 'rejected' | 'merged' | 'pending';

  // If merged (homonym resolved)
  mergedWith?: string;                      // Other collaboratorId

  // Qualified relationship
  relationship?: 'supervisor' | 'student' | 'colleague' | 'external' | 'unknown';

  notes?: string;
  validatedAt: Date;
}

// API for validation
interface ProfileValidationAPI {
  // Affiliations
  validateAffiliation: (
    profileId: string,
    segmentId: string,
    validation: Omit<AffiliationValidation, 'id' | 'validatedAt'>
  ) => Effect<AffiliationValidation, ValidationError>;

  addMissingAffiliation: (
    profileId: string,
    affiliation: NewAffiliation
  ) => Effect<AffiliationSegment, ValidationError>;

  // Expertise
  validateExpertise: (
    profileId: string,
    domainId: string,
    validation: Omit<ExpertiseValidation, 'id' | 'validatedAt'>
  ) => Effect<ExpertiseValidation, ValidationError>;

  addSelfDeclaredExpertise: (
    profileId: string,
    expertise: SelfDeclaredExpertise
  ) => Effect<ExpertiseDomain, ValidationError>;

  // Collaborations
  validateCollaboration: (
    profileId: string,
    collaboratorId: string,
    validation: Omit<CollaborationValidation, 'id' | 'validatedAt'>
  ) => Effect<CollaborationValidation, ValidationError>;

  mergeCollaborators: (
    profileId: string,
    collaboratorIds: string[],
    canonicalId: string
  ) => Effect<void, ValidationError>;
}
```

---

## Integration in Atlas Verify

### Updated Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ATLAS VERIFY - EXTENDED ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      RESEARCHER PROFILE MODULE                           ││
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                ││
│  │  │  Affiliation  │  │   Expertise   │  │ Collaboration │                ││
│  │  │  Reconstructor│  │   Builder     │  │   Analyzer    │                ││
│  │  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘                ││
│  │          │                  │                  │                         ││
│  │          └──────────────────┼──────────────────┘                         ││
│  │                             ▼                                            ││
│  │                    ┌─────────────────┐                                   ││
│  │                    │  Profile Merger │                                   ││
│  │                    │  & Validator    │                                   ││
│  │                    └────────┬────────┘                                   ││
│  └─────────────────────────────┼────────────────────────────────────────────┘│
│                                │                                             │
│  ┌─────────────────────────────┼────────────────────────────────────────────┐│
│  │                             ▼                                            ││
│  │  ┌─────────────┐   ┌─────────────────┐   ┌─────────────┐                ││
│  │  │   Sources   │──>│  Verification   │──>│   Profile   │                ││
│  │  │ (OpenAlex,  │   │    Engine       │   │   Store     │                ││
│  │  │  ORCID...)  │   │ (publications)  │   │             │                ││
│  │  └─────────────┘   └─────────────────┘   └─────────────┘                ││
│  │                                                                          ││
│  │                      VERIFICATION MODULE                                 ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │                         WEB APPLICATION                                  ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    ││
│  │  │  Dashboard  │  │Publications │  │   Career    │  │  Expertise  │    ││
│  │  │   (stats)   │  │   Review    │  │  Timeline   │  │   Profile   │    ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Additional API Endpoints

```yaml
# Atlas Verify API extension

paths:
  # ═══════════════════════════════════════════════════════════════════════
  # CAREER / AFFILIATIONS
  # ═══════════════════════════════════════════════════════════════════════

  /profile/career:
    get:
      summary: Reconstructed career path
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CareerTimeline'

  /profile/career/affiliations:
    get:
      summary: Affiliation timeline
    post:
      summary: Add missing affiliation

  /profile/career/affiliations/{id}/validate:
    post:
      summary: Validate or correct an affiliation

  # ═══════════════════════════════════════════════════════════════════════
  # EXPERTISE
  # ═══════════════════════════════════════════════════════════════════════

  /profile/expertise:
    get:
      summary: Complete expertise profile
      parameters:
        - name: includeTimeline
          in: query
          schema:
            type: boolean
        - name: minLevel
          in: query
          schema:
            $ref: '#/components/schemas/ExpertiseLevel'

  /profile/expertise/domains:
    get:
      summary: Detected expertise domains
    post:
      summary: Add self-declared expertise

  /profile/expertise/domains/{id}/validate:
    post:
      summary: Validate or adjust an expertise domain

  /profile/expertise/timeline:
    get:
      summary: Temporal expertise evolution

  /profile/expertise/recalculate:
    post:
      summary: Recalculate expertise with new parameters
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                methods:
                  type: array
                  items:
                    enum: [openalex_topics, keywords, text_analysis, citations]
                minPublications:
                  type: integer
                minScore:
                  type: number

  # ═══════════════════════════════════════════════════════════════════════
  # COLLABORATIONS
  # ═══════════════════════════════════════════════════════════════════════

  /profile/collaborations:
    get:
      summary: Collaboration network
      parameters:
        - name: format
          in: query
          schema:
            enum: [list, graph]

  /profile/collaborations/network:
    get:
      summary: Co-author graph (network format)
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CollaborationNetwork'

  /profile/collaborations/{id}/validate:
    post:
      summary: Validate a collaborator

  /profile/collaborations/merge:
    post:
      summary: Merge homonyms
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [collaboratorIds, canonicalId]
              properties:
                collaboratorIds:
                  type: array
                  items:
                    type: string
                canonicalId:
                  type: string

components:
  schemas:
    CareerTimeline:
      type: object
      properties:
        affiliations:
          type: array
          items:
            $ref: '#/components/schemas/AffiliationSegment'
        gaps:
          type: array
          items:
            $ref: '#/components/schemas/TimeGap'
        conflicts:
          type: array
          items:
            $ref: '#/components/schemas/AffiliationConflict'
        completeness:
          type: number
          description: Completeness score 0-1

    ExpertiseLevel:
      type: string
      enum: [emerging, developing, established, leading]

    CollaborationNetwork:
      type: object
      properties:
        nodes:
          type: array
          items:
            $ref: '#/components/schemas/CollaboratorNode'
        edges:
          type: array
          items:
            $ref: '#/components/schemas/CollaborationEdge'
        metrics:
          $ref: '#/components/schemas/NetworkMetrics'
```

---

## Implementation Recommendations

### Source Priority for Each Dimension

| Dimension | Primary Source | Secondary Sources | Reason |
|-----------|----------------|-------------------|--------|
| **Affiliation dates** | ORCID | OpenAlex (years) | Only ORCID has explicit dates |
| **Institution** | ROR (via OpenAlex) | HAL structures, ORCID | Universal disambiguated identifier |
| **Role/Title** | ORCID | - | Only ORCID has it |
| **Hierarchy** | HAL | OpenAlex lineage | HAL very detailed for France |
| **Expertise** | OpenAlex Topics | Keywords, NLP | ML-based topics are very reliable |
| **Collaborations** | All sources | - | Maximum aggregation |

### Recommended Technical Stack

```typescript
// Services for profile reconstruction

interface ProfileReconstructionServices {
  // Institution resolution
  institutionResolver: {
    resolveByRor: (rorId: string) => Effect<Institution, NotFoundError>;
    resolveByName: (name: string) => Effect<Institution[], AmbiguousError>;
    matchAffiliationString: (raw: string) => Effect<InstitutionMatch, NoMatchError>;
  };

  // Career reconstruction
  careerReconstructor: {
    buildTimeline: (authorId: string) => Effect<CareerTimeline, ReconstructionError>;
    detectGaps: (timeline: CareerTimeline) => TimeGap[];
    resolveConflicts: (conflicts: AffiliationConflict[]) => AffiliationSegment[];
  };

  // Expertise building
  expertiseBuilder: {
    fromOpenAlexTopics: (works: Work[]) => ExpertiseDomain[];
    fromKeywords: (works: Work[]) => ExpertiseDomain[];
    fromTextAnalysis: (abstracts: string[]) => Effect<ExpertiseDomain[], NlpError>;
    merge: (sources: ExpertiseDomain[][]) => ExpertiseDomain[];
  };

  // Collaboration analysis
  collaborationAnalyzer: {
    buildNetwork: (works: Work[]) => CollaborationNetwork;
    detectPatterns: (network: CollaborationNetwork) => CollaborationPattern[];
    analyzeTimeline: (network: CollaborationNetwork) => CollaborationTimeline;
  };
}
```
