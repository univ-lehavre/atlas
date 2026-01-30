# Data Sources

This guide explains where the data used by Atlas Verify comes from and how it is combined.

## Why Multiple Sources?

No bibliographic database is complete. Each source has its strengths and limitations:

| Source | Strengths | Limitations |
|--------|-----------|-------------|
| **OpenAlex** | Very comprehensive (240M+ publications), free | Sometimes imprecise affiliations |
| **ORCID** | Data entered by researchers themselves | Depends on what you have provided |
| **HAL** | Reference for French research | Primarily France |
| **Crossref** | Official DOIs, publisher metadata | No author identifiers |
| **ArXiv** | Recent preprints | Exact sciences only |

By combining these sources, Atlas Verify builds a more complete and reliable profile.

## Sources in Detail

### OpenAlex

**What it is**: An open database from Microsoft Research containing over 240 million scientific publications.

**What it provides**:
- Your publications with their metadata
- Your automatically detected affiliations
- Your research domains (Topics)
- Your citation metrics

**Reliability**: ⭐⭐⭐⭐ (very good for publications, variable for affiliations)

> OpenAlex automatically assigns an identifier to each detected researcher. If you have an ORCID, it is linked to this identifier.

### ORCID

**What it is**: An international registry of unique identifiers for researchers, managed by a non-profit organization.

**What it provides**:
- Your publications that you have declared
- Your professional career
- Your education
- Your funding

**Reliability**: ⭐⭐⭐⭐⭐ (data you have validated yourself)

> **Tip**: Create and maintain your ORCID profile. It's free and significantly improves the reliability of your Atlas Verify profile.

### HAL (Hyper Articles en Ligne)

**What it is**: A French open archive managed by CNRS, Inria, and other institutions.

**What it provides**:
- Your publications deposited in France
- Standardized French research structures
- Full text often available

**Reliability**: ⭐⭐⭐⭐ (excellent for French authors)

> If you are a researcher in France, depositing your articles on HAL improves your visibility and the quality of your profile.

### Crossref

**What it is**: The official registry of DOIs (Digital Object Identifiers), managed by scientific publishers.

**What it provides**:
- Official publication metadata
- Citation links between articles
- Funding information

**Reliability**: ⭐⭐⭐⭐⭐ (official data from publishers)

> Crossref does not contain author identifiers (no systematic ORCID), which makes attribution more difficult.

### ArXiv

**What it is**: A preprint server for exact sciences (physics, mathematics, computer science...).

**What it provides**:
- Your preprints before official publication
- Successive versions of your work
- Full text

**Reliability**: ⭐⭐⭐ (good but limited to exact sciences)

## How Sources Are Combined

### Fusion Principle

Atlas Verify doesn't just add up sources. It intelligently cross-references them:

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR PROFILE                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   OpenAlex    ORCID     HAL      Crossref    ArXiv     │
│      │          │        │          │          │        │
│      └──────────┼────────┼──────────┼──────────┘        │
│                 │        │          │                   │
│                 ▼        ▼          ▼                   │
│           ┌─────────────────────────────┐               │
│           │   Fusion algorithm          │               │
│           │   - Deduplication           │               │
│           │   - Conflict resolution     │               │
│           │   - Confidence score        │               │
│           └─────────────────────────────┘               │
│                         │                               │
│                         ▼                               │
│              Unified and reliable profile               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Deduplication

The same article may appear in multiple sources:
- ArXiv version (preprint)
- Publisher version (via Crossref)
- HAL deposit (open archive)
- ORCID declaration (by you)
- OpenAlex indexing (automatic)

Atlas Verify identifies that it's the same article using the DOI and merges them into a single entry.

### Conflict Resolution

When sources contradict each other, the system applies priority rules:

| Information | Priority source | Reason |
|-------------|-----------------|--------|
| **Your personal data** | ORCID | You entered it |
| **Publication date** | Crossref/DOI | Official data |
| **Affiliation at time of publication** | HAL > OpenAlex | More reliable |
| **Research domains** | OpenAlex | Better coverage |
| **Full text** | HAL > ArXiv | Open access |

### Confidence Score

Each piece of information receives a score based on:
- Number of concordant sources
- Reliability of each source for this type of information
- Consistency with your other data

## What to Do If a Source Is Incorrect?

### Misattributed Publication

If a publication from a source isn't yours:
1. Go to **Verify your publications**
2. Find the concerned publication
3. Click on **Reject**
4. Indicate the reason (homonym, database error...)

### Incorrect Affiliation

If a source indicates a wrong affiliation:
1. Go to **Manage your career**
2. Correct or delete the erroneous affiliation
3. Your correction will take priority

### Missing Information

If a publication or affiliation doesn't appear:
- Check that it is indeed in the source databases
- Add it manually if necessary
- Or update your ORCID profile (recommended)

## Data Freshness

| Source | Update frequency | Propagation delay |
|--------|------------------|-------------------|
| OpenAlex | Daily | 1-7 days |
| ORCID | Real-time | Immediate |
| HAL | Daily | 1-2 days |
| Crossref | Continuous | 1-30 days |
| ArXiv | Daily | 1-2 days |

> After a new publication, expect approximately **1 to 2 weeks** before it automatically appears in your profile.

## See Also

- [Verify your publications](./verify-publications.md) - Validate the data
- [Manage your career](./manage-career.md) - Correct affiliations
- [Expertise profile](./expertise-profile.md) - Based on these sources

**Technical documentation:** [Source catalog](../dev/sources/catalog.md) - For developers
