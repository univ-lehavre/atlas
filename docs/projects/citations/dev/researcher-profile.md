# Profil chercheur et reconstruction de carrière

Ce document décrit comment reconstruire le parcours d'un chercheur (affiliations, expertises, collaborations) à partir des sources bibliographiques, et comment valider ces informations.

> **Voir aussi :**
> - [Fiabilisation auteur](./author-verification.md) - Validation des publications
> - [Schéma unifié](./unified-schema.md) - Entités Work, Author, Institution
> - [Catalogue des sources](./sources/catalog.md) - Détail des données disponibles par source
>
> **Documentation utilisateur :**
> - [Gérer votre parcours](../user/manage-career.md) - Guide pour chercheurs
> - [Profil d'expertise](../user/expertise-profile.md) - Vos domaines de recherche
> - [Réseau de collaborations](../user/collaboration-network.md) - Vos co-auteurs

---

## Problématique

La reconstruction du parcours d'un chercheur est complexe car :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DÉFIS DE LA RECONSTRUCTION DE CARRIÈRE                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DONNÉES FRAGMENTÉES                    INCOHÉRENCES TEMPORELLES            │
│  ──────────────────                     ────────────────────────            │
│  • Affiliations dans chaque source      • Dates de début/fin manquantes    │
│  • Formats différents                   • Chevauchements incohérents       │
│  • Granularité variable                 • Années approximatives            │
│  • Identifiants incompatibles           • Mobilité non tracée              │
│                                                                              │
│  AMBIGUÏTÉ DES ORGANISATIONS            ÉVOLUTION DES EXPERTISES           │
│  ────────────────────────────           ─────────────────────────           │
│  • Renommages d'universités             • Topics évoluent dans le temps    │
│  • Fusions de laboratoires              • Nouvelles disciplines            │
│  • Rattachements multiples              • Interdisciplinarité croissante   │
│  • Hiérarchies complexes                • Spécialisation vs généralisation │
│                                                                              │
│  EXEMPLE : Dr. Marie Dupont                                                 │
│  ─────────────────────────────────────────────────────────────────          │
│  OpenAlex: "Université Paris-Saclay" (2020-présent)                        │
│  Crossref: "CEA Saclay" (position = 1 sur article 2021)                    │
│  HAL:      "LSCE, CEA/CNRS/UVSQ" (structure de recherche)                  │
│  ORCID:    "CEA" (employment 2018-présent)                                 │
│            "Université Paris-Sud" (education 2014-2017)                     │
│  → 4 représentations différentes de la même réalité                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Données d'affiliation par source

### Matrice de disponibilité

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                     AFFILIATIONS - DISPONIBILITÉ PAR SOURCE                                 │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  CHAMP                    │ OA  │ CR  │ HAL │ ORC │ S2  │ PM  │ DBL │ SCOPUS │             │
│  ─────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼────────┼             │
│  Nom institution          │ ✅  │ ✅  │ ✅  │ ✅  │ ✅  │ ✅  │ ⚠️  │ ✅     │             │
│  ROR ID                   │ ✅  │ ⚠️  │ ❌  │ ⚠️  │ ❌  │ ❌  │ ❌  │ ❌     │             │
│  Identifiant interne      │ ✅  │ ❌  │ ✅  │ ❌  │ ❌  │ ❌  │ ❌  │ ✅     │             │
│  Pays                     │ ✅  │ ⚠️  │ ✅  │ ✅  │ ⚠️  │ ✅  │ ⚠️  │ ✅     │             │
│  Ville                    │ ⚠️  │ ⚠️  │ ⚠️  │ ⚠️  │ ❌  │ ⚠️  │ ❌  │ ⚠️     │             │
│  Coordonnées GPS          │ ⚠️  │ ❌  │ ❌  │ ❌  │ ❌  │ ❌  │ ❌  │ ❌     │             │
│  Type (univ/labo/etc)     │ ✅  │ ❌  │ ✅  │ ✅  │ ❌  │ ❌  │ ❌  │ ✅     │             │
│  Hiérarchie               │ ⚠️  │ ❌  │ ✅  │ ❌  │ ❌  │ ❌  │ ❌  │ ⚠️     │             │
│  Date début               │ ⚠️  │ ❌  │ ❌  │ ✅  │ ❌  │ ❌  │ ❌  │ ❌     │             │
│  Date fin                 │ ⚠️  │ ❌  │ ❌  │ ✅  │ ❌  │ ❌  │ ❌  │ ❌     │             │
│  Rôle/Titre               │ ❌  │ ❌  │ ❌  │ ✅  │ ❌  │ ❌  │ ❌  │ ❌     │             │
│  Département              │ ⚠️  │ ⚠️  │ ✅  │ ⚠️  │ ❌  │ ❌  │ ❌  │ ⚠️     │             │
│                                                                                             │
│  LÉGENDE: ✅ Disponible  ⚠️ Partiel  ❌ Non disponible                                     │
│                                                                                             │
│  OA=OpenAlex, CR=Crossref, HAL, ORC=ORCID, S2=SemanticScholar, PM=PubMed, DBL=DBLP        │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Détail par source

#### OpenAlex

```typescript
// Structure affiliations OpenAlex (Author entity)
interface OpenAlexAuthorAffiliation {
  institution: {
    id: string;                    // "I27837315"
    ror: string;                   // "https://ror.org/00f54p054"
    display_name: string;          // "Stanford University"
    country_code: string;          // "US"
    type: string;                  // "education" | "facility" | "company" | ...
    lineage: string[];             // Hiérarchie ["I27837315", "I154495582"]
  };
  years: number[];                 // [2018, 2019, 2020, 2021]
}

// Sur les Works (authorships)
interface OpenAlexAuthorship {
  author: { id: string; display_name: string; orcid?: string };
  institutions: Array<{
    id: string;
    display_name: string;
    ror: string;
    country_code: string;
    type: string;
  }>;
  raw_affiliation_strings: string[];  // Texte brut original
}
```

**Points forts OpenAlex :**
- ROR systématique (90%+ des institutions)
- Années de présence déduites des publications
- Géolocalisation via ROR
- Hiérarchie institutionnelle (lineage)

**Limitations :**
- Pas de dates précises (début/fin)
- Pas de rôle/titre
- Déduction algorithmique (peut contenir des erreurs)

#### ORCID

```typescript
// Structure ORCID - Employments
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
    source_name: string;                    // "Stanford University" ou auteur
    assertion_origin_name?: string;
  };
}

// Structure ORCID - Education
interface OrcidEducation {
  organization: { /* same as employment */ };
  department_name?: string;
  role_title?: string;                      // "PhD", "MSc", "BSc"
  start_date: { year: number; month?: number; day?: number };
  end_date?: { year: number; month?: number; day?: number };
}
```

**Points forts ORCID :**
- Dates précises (mois, jour parfois)
- Rôle et titre explicites
- Distinction employment/education
- Données déclaratives (source de vérité pour l'auteur)
- Source de l'assertion (auto-déclaré vs institution)

**Limitations :**
- Pas de ROR systématique (RINGGOLD, GRID parfois)
- Complétude variable (dépend de l'auteur)
- Pas de validation systématique

#### HAL

```typescript
// Structure HAL - Affiliations sur documents
interface HalAffiliation {
  structId_i: number;                       // ID structure HAL
  structName_s: string;                     // "Laboratoire des Sciences du Climat"
  structAcronym_s?: string;                 // "LSCE"
  structType_s: string;                     // "laboratory", "institution", "department"
  structCountry_s: string;                  // "fr"
  structAddress_s?: string;

  // Hiérarchie
  structParent_i?: number[];                // IDs des structures parentes
  structParentName_s?: string[];            // ["CEA", "CNRS", "UVSQ"]

  // Tutelles
  structTutelles_s?: string[];              // ["CEA", "CNRS", "UVSQ"]
}

// Référentiel AuréHAL (structures)
interface HalStructure {
  docid: number;
  label_s: string;
  acronym_s?: string;
  type_s: string;
  parentDocid_i?: number[];
  address_s?: string;
  country_s: string;
  url_s?: string;
  rnsr_s?: string;                          // Code RNSR (répertoire national)
  idRef_s?: string;                         // IdRef ABES
  isni_s?: string;                          // ISNI
}
```

**Points forts HAL :**
- Hiérarchie détaillée (labo → département → université)
- Tutelles multiples (CNRS + Université)
- Référentiel structuré (AuréHAL)
- Codes nationaux (RNSR, IdRef)
- Spécifique recherche française

**Limitations :**
- Pas de ROR natif
- Pas de dates de présence
- Principalement France

#### Crossref

```typescript
// Structure Crossref - Affiliations sur Works
interface CrossrefAuthor {
  given?: string;
  family: string;
  sequence: string;                         // "first", "additional"
  affiliation: Array<{
    name: string;                           // Texte brut uniquement
  }>;
  ORCID?: string;
}
```

**Points forts Crossref :**
- Couverture mondiale massive
- Affiliation au moment de publication
- Texte brut original de l'éditeur

**Limitations :**
- Texte brut non structuré
- Pas d'identifiants (ROR en cours d'adoption)
- Qualité variable selon éditeurs

---

## Reconstruction du parcours d'affiliation

### Algorithme de fusion

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

### Processus de reconstruction

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RECONSTRUCTION PARCOURS AFFILIATION                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. COLLECTE                                                                 │
│  ───────────                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ ORCID   │  │OpenAlex │  │   HAL   │  │Crossref │  │ Scopus  │          │
│  │ (decl.) │  │(infer.) │  │(struct.)│  │ (brut)  │  │(struct.)│          │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘          │
│       │            │            │            │            │                 │
│       └────────────┴────────────┴────────────┴────────────┘                 │
│                                  │                                           │
│  2. NORMALISATION                ▼                                           │
│  ─────────────────  ┌───────────────────────┐                               │
│                     │  Institution Resolver │                               │
│                     │  - ROR matching       │                               │
│                     │  - Name normalization │                               │
│                     │  - Hierarchy mapping  │                               │
│                     └───────────┬───────────┘                               │
│                                 │                                            │
│  3. ALIGNEMENT                  ▼                                            │
│  ──────────────    ┌────────────────────────┐                               │
│                    │   Timeline Builder     │                               │
│                    │   - Date alignment     │                               │
│                    │   - Gap detection      │                               │
│                    │   - Overlap resolution │                               │
│                    └───────────┬────────────┘                               │
│                                │                                             │
│  4. RÉSOLUTION                 ▼                                             │
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

### Règles de priorité

```typescript
const affiliationPriorityRules: PriorityRule[] = [
  // 1. ORCID déclaré par l'auteur = source de vérité
  {
    condition: (s) => s.source === 'orcid' && s.evidence === 'declaration',
    priority: 100,
    confidence: 0.95,
  },

  // 2. ORCID ajouté par l'institution
  {
    condition: (s) => s.source === 'orcid' && s.sourceAssertion === 'institution',
    priority: 90,
    confidence: 0.90,
  },

  // 3. HAL avec structure validée
  {
    condition: (s) => s.source === 'hal' && s.structureValidated,
    priority: 80,
    confidence: 0.85,
  },

  // 4. OpenAlex avec ROR résolu
  {
    condition: (s) => s.source === 'openalex' && s.rorId,
    priority: 70,
    confidence: 0.80,
  },

  // 5. Crossref/autres avec texte brut
  {
    condition: (s) => !s.resolvedInstitutionId,
    priority: 30,
    confidence: 0.50,
  },
];

// Résolution des conflits de dates
const resolveDateConflict = (
  segment1: AffiliationSegment,
  segment2: AffiliationSegment
): AffiliationSegment => {
  // ORCID a la priorité sur les dates
  if (segment1.sources.some(s => s.source === 'orcid')) {
    return { ...segment1, sources: [...segment1.sources, ...segment2.sources] };
  }

  // Sinon, utiliser la précision la plus fine
  if (segment1.startDate.precision < segment2.startDate.precision) {
    return { ...segment1, startDate: segment2.startDate };
  }

  return segment1;
};
```

---

## Construction du profil d'expert

### Sources de données pour l'expertise

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SOURCES DE DONNÉES POUR EXPERTISE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SOURCE              DONNÉES                    QUALITÉ    GRANULARITÉ      │
│  ────────────────────────────────────────────────────────────────────       │
│                                                                              │
│  OpenAlex Topics     • Concepts hiérarchiques   ⭐⭐⭐⭐⭐  Très fine        │
│                      • 65k+ topics              (ML-based)  (4 niveaux)     │
│                      • Score par publication                                 │
│                      • Évolution temporelle                                  │
│                                                                              │
│  Keywords (sources)  • Mots-clés auteur         ⭐⭐⭐     Variable         │
│                      • Mots-clés éditeur                   (libre)           │
│                      • Subject headings                                      │
│                                                                              │
│  Abstract analysis   • NLP sur résumés          ⭐⭐⭐⭐   Fine             │
│                      • Extraction d'entités               (custom)          │
│                      • Clustering thématique                                 │
│                                                                              │
│  Full-text analysis  • NLP sur texte complet    ⭐⭐⭐⭐⭐  Très fine        │
│                      • Méthodologies                       (si dispo)        │
│                      • Techniques utilisées                                  │
│                                                                              │
│  Citations reçues    • Qui cite l'auteur ?      ⭐⭐⭐⭐   Indirecte         │
│                      • Dans quel contexte ?               (influence)       │
│                                                                              │
│  Classifications     • CCS (Computer Science)   ⭐⭐⭐⭐   Standardisée      │
│  externes            • MeSH (Médecine)                    (domaine)         │
│                      • JEL (Économie)                                        │
│                      • PACS (Physique)                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Approches de construction

#### 1. OpenAlex Topics (recommandée)

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

// Profil d'expertise à partir des topics OpenAlex
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

  // Filtrer et scorer
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

#### 2. Analyse de texte (Abstract/Full-text)

```typescript
interface TextAnalysisConfig {
  useAbstract: boolean;
  useFullText: boolean;                     // Si disponible (HAL, ArXiv, etc.)
  extractionMethods: ExtractionMethod[];
}

type ExtractionMethod =
  | 'keyword_extraction'                    // TF-IDF, RAKE, YAKE
  | 'named_entity_recognition'              // SpaCy, Stanza
  | 'topic_modeling'                        // LDA, BERTopic
  | 'embedding_clustering'                  // SPECTER, SciBERT
  | 'methodology_detection';                // Patterns spécifiques

// Exemple avec BERTopic
const analyzeTextsWithBERTopic = async (
  texts: string[]
): Promise<TopicCluster[]> => {
  // Embeddings avec SPECTER (spécialisé publications scientifiques)
  const embeddings = await generateEmbeddings(texts, 'allenai/specter2');

  // Clustering et extraction de topics
  const clusters = await clusterWithHDBSCAN(embeddings);

  // Représentation des topics
  return clusters.map(cluster => ({
    id: cluster.id,
    keywords: extractKeywordsFromCluster(cluster, texts),
    representativeWorks: cluster.indices.slice(0, 5),
    size: cluster.indices.length,
    coherence: cluster.coherenceScore,
  }));
};

// Extraction de méthodologies
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

#### 3. Analyse des citations reçues

```typescript
interface CitationContext {
  citingWork: Work;
  context: string;                          // Phrase/paragraphe de citation
  sentiment: 'positive' | 'neutral' | 'negative' | 'critical';
  purpose: CitationPurpose;
}

type CitationPurpose =
  | 'background'                            // Contexte général
  | 'method_use'                            // Utilise la méthode
  | 'comparison'                            // Compare les résultats
  | 'extension'                             // Étend les travaux
  | 'critique';                             // Critique/réfute

// Impact par domaine
const analyzeInfluenceByDomain = (
  authorWorks: Work[],
  citations: CitationContext[]
): DomainInfluence[] => {
  const influenceByDomain = new Map<string, DomainStats>();

  for (const citation of citations) {
    // Domain du travail citant
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

### Combinaison multi-sources

```typescript
interface ExpertProfile {
  // Identité
  authorId: string;
  displayName: string;

  // Domaines d'expertise (agrégés)
  domains: ExpertiseDomain[];

  // Timeline d'expertise
  expertiseTimeline: ExpertiseTimepoint[];

  // Métriques
  metrics: ExpertiseMetrics;

  // Collaborations
  collaborationNetwork: CollaborationStats;

  // Confidence et sources
  confidence: number;
  dataCompleteness: DataCompleteness;
}

interface ExpertiseDomain {
  // Identification
  id: string;
  name: string;
  hierarchy: string[];                      // ["Computer Science", "AI", "NLP"]

  // Niveau d'expertise
  level: ExpertiseLevel;
  score: number;                            // 0.0 - 1.0

  // Preuves
  evidence: {
    publications: number;
    citations: number;
    hIndexInDomain?: number;
    firstPublicationYear: number;
    lastPublicationYear: number;
  };

  // Sources de l'évaluation
  sources: {
    openalex_topics?: { count: number; avgScore: number };
    keywords?: { count: number; sources: string[] };
    text_analysis?: { method: string; confidence: number };
    citations?: { inDomainCitations: number };
  };
}

// Fusion des expertises de différentes sources
const fuseExpertiseSources = (
  openalexTopics: TopicStats[],
  extractedKeywords: KeywordStats[],
  textAnalysis: TopicCluster[],
  citationAnalysis: DomainInfluence[]
): ExpertiseDomain[] => {
  const unified = new Map<string, ExpertiseDomain>();

  // 1. Base : OpenAlex Topics (plus fiable)
  for (const topic of openalexTopics) {
    const domain = createDomainFromTopic(topic);
    domain.sources.openalex_topics = {
      count: topic.works.length,
      avgScore: topic.totalScore / topic.works.length,
    };
    unified.set(domain.id, domain);
  }

  // 2. Enrichir avec keywords
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

  // 3. Enrichir avec analyse de texte
  for (const cluster of textAnalysis) {
    const matchedDomain = findMatchingDomainByKeywords(cluster.keywords, unified);
    if (matchedDomain) {
      matchedDomain.sources.text_analysis = {
        method: 'bertopic',
        confidence: cluster.coherence,
      };
    }
  }

  // 4. Enrichir avec citations
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

## Analyse temporelle des expertises

### Timeline d'expertise

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

// Construction de la timeline
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

    // Compter les publications par domaine cette année
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

    // Mettre à jour les cumulatifs
    for (const [domainId, stats] of domainStats) {
      const cumulative = (cumulativeByDomain.get(domainId) ?? 0) + stats.publicationsThisYear;
      cumulativeByDomain.set(domainId, cumulative);
    }

    // Détecter les changements
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

// Détection des pivots thématiques
const detectShifts = (
  previous: ExpertiseTimepoint | undefined,
  current: Map<string, DomainYearStats>,
  cumulative: Map<string, number>
): ExpertiseShift[] => {
  const shifts: ExpertiseShift[] = [];

  if (!previous) return shifts;

  const prevDomains = new Set(previous.domains.map(d => d.domain.id));
  const currDomains = new Set(current.keys());

  // Nouveaux domaines (émergence)
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

  // Domaines disparus (déclin)
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

### Visualisation temporelle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TIMELINE D'EXPERTISE - Dr. Marie Dupont                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  2015      2016      2017      2018      2019      2020      2021      2022 │
│    │         │         │         │         │         │         │         │  │
│    │         │         │         │         │         │         │         │  │
│  ██████    █████    ██████    ████      ███        ██                      │  │
│  NLP       NLP      NLP       NLP      NLP       NLP      Emergence →      │
│                                                            Climate NLP      │
│            ████     ███████   ████████ █████████ ████████ ███████████████ │
│            Deep     Deep      Deep     Deep      Deep     Deep Learning    │
│            Learn.   Learn.    Learn.   Learn.    Learn.                    │
│                                                                              │
│                               ████     ██████    █████████ ████████████   │
│                               Climate  Climate   Climate   Climate Science │
│                               Science  Science   Science                    │
│                                                                              │
│  SHIFTS DÉTECTÉS :                                                          │
│  ─────────────────                                                          │
│  2017: Émergence "Deep Learning" (pivot méthodologique)                    │
│  2018: Émergence "Climate Science" (nouveau domaine d'application)         │
│  2021: Émergence "Climate NLP" (convergence de 2 expertises)               │
│                                                                              │
│  INTERPRÉTATION :                                                           │
│  ────────────────                                                           │
│  Évolution d'une expertise NLP traditionnelle vers une application         │
│  interdisciplinaire combinant IA et sciences du climat.                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Analyse des collaborations

### Extraction du réseau de co-auteurs

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

  // Métriques locales
  collaborationCount: number;
  firstCollabYear: number;
  lastCollabYear: number;
  sharedTopics: string[];
}

interface CollaborationEdge {
  source: string;                           // authorId
  target: string;                           // authorId
  weight: number;                           // Nombre de co-publications
  years: number[];                          // Années de collaboration
  works: string[];                          // IDs des publications communes
  type: CollaborationType;
}

type CollaborationType =
  | 'institutional'                         // Même institution
  | 'national'                              // Même pays
  | 'international'                         // Pays différents
  | 'interdisciplinary';                    // Domaines différents

interface NetworkMetrics {
  totalCollaborators: number;
  averageCollaboratorsPerPaper: number;
  internationalCollaborationRate: number;
  interdisciplinaryRate: number;
  networkDensity: number;
  clusteringCoefficient: number;
}

// Construction du réseau
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

### Évolution temporelle des collaborations

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

// Analyse des patterns de collaboration
const analyzeCollaborationPatterns = (
  network: CollaborationNetwork,
  works: Work[]
): CollaborationPattern[] => {
  const patterns: CollaborationPattern[] = [];

  // 1. Collaborateurs récurrents (équipe stable)
  const recurring = network.nodes.filter(n => n.collaborationCount >= 3);
  if (recurring.length >= 3) {
    patterns.push({
      type: 'stable_team',
      description: `Équipe stable de ${recurring.length} collaborateurs récurrents`,
      members: recurring.map(n => n.name),
      period: { start: Math.min(...recurring.map(n => n.firstCollabYear)), end: /* now */ },
    });
  }

  // 2. Hub de collaboration
  const highDegreeNodes = network.nodes.filter(n => n.collaborationCount >= 5);
  for (const hub of highDegreeNodes) {
    patterns.push({
      type: 'collaboration_hub',
      description: `Collaboration intensive avec ${hub.name}`,
      evidence: `${hub.collaborationCount} publications communes`,
    });
  }

  // 3. Internationalisation croissante
  const intlByYear = calculateInternationalRateByYear(network, works);
  if (isIncreasingTrend(intlByYear)) {
    patterns.push({
      type: 'internationalization',
      description: 'Internationalisation croissante des collaborations',
      trend: intlByYear,
    });
  }

  return patterns;
};
```

---

## Validation utilisateur

### Interface de révision du parcours

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VALIDATION DU PARCOURS - Dr. Marie Dupont                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║  AFFILIATIONS RECONSTITUÉES                                            ║  │
│  ╠═══════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                         ║  │
│  ║  2018-présent   CEA Saclay - LSCE                           [✓] [✗]   ║  │
│  ║                 Sources: ORCID ✓, HAL ✓, OpenAlex ✓                    ║  │
│  ║                 Confiance: 95%                                          ║  │
│  ║                                                                         ║  │
│  ║  2014-2017      Université Paris-Sud                        [✓] [✗]   ║  │
│  ║                 Doctorat en Physique                                   ║  │
│  ║                 Sources: ORCID ✓                                        ║  │
│  ║                 Confiance: 90%                                          ║  │
│  ║                                                                         ║  │
│  ║  ⚠️ GAP DÉTECTÉ: 2017-2018 (post-doc ?)                     [Compléter]║  │
│  ║                                                                         ║  │
│  ║  [+ Ajouter une affiliation manquante]                                 ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║  EXPERTISES DÉTECTÉES                                                  ║  │
│  ╠═══════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                         ║  │
│  ║  ⭐⭐⭐⭐⭐  Climate Modeling (Leading)                     [✓] [✗]   ║  │
│  ║              15 publications, 2015-2023                                ║  │
│  ║              Sources: OpenAlex Topics, HAL Keywords                     ║  │
│  ║                                                                         ║  │
│  ║  ⭐⭐⭐⭐    Machine Learning (Established)                [✓] [✗]   ║  │
│  ║              8 publications, 2019-2023                                 ║  │
│  ║              Sources: OpenAlex Topics, Abstract NLP                     ║  │
│  ║                                                                         ║  │
│  ║  ⭐⭐⭐      Carbon Cycle (Developing)                     [✓] [✗]   ║  │
│  ║              4 publications, 2021-2023                                 ║  │
│  ║              ⚠️ Confiance moyenne - Voulez-vous confirmer ?            ║  │
│  ║                                                                         ║  │
│  ║  ⭐⭐        Remote Sensing (Emerging)                     [✓] [✗]   ║  │
│  ║              2 publications, 2022-2023                                 ║  │
│  ║                                                                         ║  │
│  ║  [+ Ajouter une expertise non détectée]                                ║  │
│  ║  [↻ Recalculer à partir de nouveaux critères]                          ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║  COLLABORATIONS CLÉS                                                   ║  │
│  ╠═══════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                         ║  │
│  ║  Dr. Jean Martin (CNRS)          12 pubs, 2016-2023         [✓] [✗]   ║  │
│  ║  Prof. Anna Schmidt (ETH)         8 pubs, 2019-2023         [✓] [✗]   ║  │
│  ║  Dr. Li Wei (Tsinghua)            5 pubs, 2021-2023         [✓] [✗]   ║  │
│  ║                                                                         ║  │
│  ║  ⚠️ "M. Dupont" dans 3 articles - Est-ce vous ?            [Vérifier] ║  │
│  ║                                                                         ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
│                        [Enregistrer les validations]                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Modèle de données pour la validation

```typescript
// Extension du modèle author-verification.md

interface ProfileValidation {
  profileId: string;

  // Validations d'affiliations
  affiliationValidations: AffiliationValidation[];

  // Validations d'expertises
  expertiseValidations: ExpertiseValidation[];

  // Validations de collaborations
  collaborationValidations: CollaborationValidation[];

  // Métadonnées
  lastValidatedAt: Date;
  completenessScore: number;
}

interface AffiliationValidation {
  id: string;
  segmentId: string;                        // Référence au AffiliationSegment

  decision: 'confirmed' | 'rejected' | 'modified' | 'pending';

  // Si modifié
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
  domainId: string;                         // Référence à ExpertiseDomain

  decision: 'confirmed' | 'rejected' | 'adjusted' | 'pending';

  // Si ajusté
  adjustments?: {
    level?: ExpertiseLevel;
    customName?: string;                    // Renommage du domaine
    subdomains?: string[];                  // Précisions
  };

  // Expertise auto-déclarée (non détectée)
  selfDeclared?: boolean;

  notes?: string;
  validatedAt: Date;
}

interface CollaborationValidation {
  id: string;
  collaboratorId: string;                   // AuthorId du co-auteur

  decision: 'confirmed' | 'rejected' | 'merged' | 'pending';

  // Si merged (homonyme résolu)
  mergedWith?: string;                      // Autre collaboratorId

  // Relation qualifiée
  relationship?: 'supervisor' | 'student' | 'colleague' | 'external' | 'unknown';

  notes?: string;
  validatedAt: Date;
}

// API pour la validation
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

  // Expertises
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

## Intégration dans Atlas Verify

### Architecture mise à jour

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ATLAS VERIFY - ARCHITECTURE ÉTENDUE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      MODULE PROFIL CHERCHEUR                             ││
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
│  │                      MODULE VÉRIFICATION                                 ││
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

### Endpoints API additionnels

```yaml
# Extension de l'API Atlas Verify

paths:
  # ═══════════════════════════════════════════════════════════════════════
  # CAREER / AFFILIATIONS
  # ═══════════════════════════════════════════════════════════════════════

  /profile/career:
    get:
      summary: Parcours de carrière reconstruit
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CareerTimeline'

  /profile/career/affiliations:
    get:
      summary: Timeline des affiliations
    post:
      summary: Ajouter une affiliation manquante

  /profile/career/affiliations/{id}/validate:
    post:
      summary: Valider ou corriger une affiliation

  # ═══════════════════════════════════════════════════════════════════════
  # EXPERTISE
  # ═══════════════════════════════════════════════════════════════════════

  /profile/expertise:
    get:
      summary: Profil d'expertise complet
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
      summary: Domaines d'expertise détectés
    post:
      summary: Ajouter une expertise auto-déclarée

  /profile/expertise/domains/{id}/validate:
    post:
      summary: Valider ou ajuster un domaine d'expertise

  /profile/expertise/timeline:
    get:
      summary: Évolution temporelle des expertises

  /profile/expertise/recalculate:
    post:
      summary: Recalculer les expertises avec nouveaux paramètres
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
      summary: Réseau de collaboration
      parameters:
        - name: format
          in: query
          schema:
            enum: [list, graph]

  /profile/collaborations/network:
    get:
      summary: Graphe de co-auteurs (format réseau)
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CollaborationNetwork'

  /profile/collaborations/{id}/validate:
    post:
      summary: Valider un collaborateur

  /profile/collaborations/merge:
    post:
      summary: Fusionner des homonymes
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
          description: Score de complétude 0-1

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

## Recommandations d'implémentation

### Priorité des sources pour chaque dimension

| Dimension | Source prioritaire | Sources secondaires | Raison |
|-----------|-------------------|---------------------|--------|
| **Dates d'affiliation** | ORCID | OpenAlex (années) | Seul ORCID a des dates explicites |
| **Institution** | ROR (via OpenAlex) | HAL structures, ORCID | Identifiant universel désambiguïsé |
| **Rôle/Titre** | ORCID | - | Seul ORCID l'a |
| **Hiérarchie** | HAL | OpenAlex lineage | HAL très détaillé pour France |
| **Expertises** | OpenAlex Topics | Keywords, NLP | Topics ML-based très fiables |
| **Collaborations** | Toutes sources | - | Agrégation maximale |

### Stack technique recommandée

```typescript
// Services pour la reconstruction de profil

interface ProfileReconstructionServices {
  // Résolution d'institutions
  institutionResolver: {
    resolveByRor: (rorId: string) => Effect<Institution, NotFoundError>;
    resolveByName: (name: string) => Effect<Institution[], AmbiguousError>;
    matchAffiliationString: (raw: string) => Effect<InstitutionMatch, NoMatchError>;
  };

  // Reconstruction de carrière
  careerReconstructor: {
    buildTimeline: (authorId: string) => Effect<CareerTimeline, ReconstructionError>;
    detectGaps: (timeline: CareerTimeline) => TimeGap[];
    resolveConflicts: (conflicts: AffiliationConflict[]) => AffiliationSegment[];
  };

  // Construction d'expertise
  expertiseBuilder: {
    fromOpenAlexTopics: (works: Work[]) => ExpertiseDomain[];
    fromKeywords: (works: Work[]) => ExpertiseDomain[];
    fromTextAnalysis: (abstracts: string[]) => Effect<ExpertiseDomain[], NlpError>;
    merge: (sources: ExpertiseDomain[][]) => ExpertiseDomain[];
  };

  // Analyse de collaborations
  collaborationAnalyzer: {
    buildNetwork: (works: Work[]) => CollaborationNetwork;
    detectPatterns: (network: CollaborationNetwork) => CollaborationPattern[];
    analyzeTimeline: (network: CollaborationNetwork) => CollaborationTimeline;
  };
}
```
