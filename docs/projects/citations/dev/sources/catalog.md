# Bibliographic Sources Catalog

This document lists all potential academic sources for atlas-citations, with their current status and the strategy for building their OpenAPI spec.

> **See also:** [Entities and Fields Reference](./entities-reference.md) for complete details on objects and attributes retrievable per source.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BIBLIOGRAPHIC SOURCES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRIORITY 1 (Implemented)              PRIORITY 2 (Planned)                 │
│  ─────────────────────────             ────────────────────────             │
│  ✅ OpenAlex                           📋 Semantic Scholar                  │
│  ✅ Crossref                           📋 PubMed/NCBI                       │
│  ✅ HAL                                📋 Unpaywall                         │
│  ✅ ArXiv                              📋 OpenCitations                     │
│  ✅ ORCID                                                                    │
│                                                                              │
│  PRIORITY 3 (Extensions)               PRIORITY 4 (Specialized)             │
│  ───────────────────────               ─────────────────────────            │
│  📋 Europe PMC                         📋 DBLP                              │
│  📋 DataCite                           📋 RePEc                             │
│  📋 DOAJ                               📋 SSRN                              │
│  📋 Zenodo                             📋 bioRxiv/medRxiv                   │
│                                                                              │
│  PAID SOURCES                          REGIONAL SOURCES                     │
│  ────────────────                      ──────────────────                   │
│  💰 Scopus                             🌍 CNKI (China)                      │
│  💰 Web of Science                     🌍 CiNii (Japan)                     │
│  💰 IEEE Xplore                        🌍 SciELO (Latin America)            │
│  💰 Dimensions                         🌍 CORE (UK)                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Legend

| Symbol | Meaning |
|---------|---------------|
| ✅ | Implemented (Priority 1) |
| 📋 | Planned |
| 💰 | Paid API |
| 🌍 | Regional source |
| ✅ OpenAPI | Official OpenAPI spec available |
| ⚠️ OpenAPI | Partial or unmaintained spec |
| ❌ OpenAPI | No OpenAPI spec |

---

## Major Academic Sources (Free)

### Semantic Scholar

| Aspect | Detail |
|--------|--------|
| **URL** | `https://api.semanticscholar.org` |
| **Operator** | Allen Institute for AI |
| **Coverage** | 200M+ articles, all disciplines |
| **OpenAPI** | ✅ [Yes](https://api.semanticscholar.org/api-docs/) |
| **Auth** | API key recommended (free) |
| **Rate limit** | 100 req/5min (without key), 1 req/sec (with key) |
| **Format** | JSON |
| **Priority** | ⭐⭐⭐ High |

**Strengths:**
- Very rich citation graph
- SPECTER embeddings for semantic similarity
- S2ORC dataset accessible
- Excellent AI/ML coverage

**Alpha construction:**
```bash
# Retrieve the official OpenAPI spec
atlas-openapi-validator fetch \
  https://api.semanticscholar.org/api-docs/openapi.json \
  --output specs/alpha/semantic-scholar-2025-01.yaml \
  --format yaml \
  --set-stage alpha

# Validate and adapt
atlas-openapi-validator validate specs/alpha/semantic-scholar-2025-01.yaml \
  --base-url https://api.semanticscholar.org/graph/v1 \
  --headers "x-api-key=${S2_API_KEY}" \
  --output reports/semantic-scholar-alpha.json
```

**Existing spec:** https://api.semanticscholar.org/api-docs/

---

### PubMed / NCBI E-utilities

| Aspect | Detail |
|--------|--------|
| **URL** | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/` |
| **Operator** | NIH / NLM |
| **Coverage** | 35M+ biomedical citations |
| **OpenAPI** | ⚠️ [Partial](https://www.ncbi.nlm.nih.gov/books/NBK25501/) |
| **Auth** | API key recommended (free) |
| **Rate limit** | 3 req/sec (without key), 10 req/sec (with key) |
| **Format** | XML, JSON (partial) |
| **Priority** | ⭐⭐⭐ High |

**Strengths:**
- Absolute reference in biomedicine
- MeSH terms for classification
- Links to full text (PMC)
- Clinical data (ClinicalTrials.gov)

**Alpha construction:**
```bash
# No complete OpenAPI spec, build from documentation
atlas-openapi-validator scaffold \
  --name pubmed \
  --base-url https://eutils.ncbi.nlm.nih.gov/entrez/eutils \
  --output specs/alpha/pubmed-2025-01.yaml

# Main endpoints to document
# - esearch.fcgi : Search
# - efetch.fcgi : Retrieval
# - einfo.fcgi : Database metadata
# - elink.fcgi : Links between databases

# Infer schemas from responses
atlas-openapi-validator infer \
  --base-url https://eutils.ncbi.nlm.nih.gov/entrez/eutils \
  --endpoints esearch.fcgi,efetch.fcgi \
  --params "db=pubmed&retmode=json" \
  --sample-size 50 \
  --merge-into specs/alpha/pubmed-2025-01.yaml
```

**Documentation:** https://www.ncbi.nlm.nih.gov/books/NBK25500/

---

### Europe PMC

| Aspect | Detail |
|--------|--------|
| **URL** | `https://www.ebi.ac.uk/europepmc/webservices/rest/` |
| **Operator** | EMBL-EBI |
| **Coverage** | 40M+ articles, European focus |
| **OpenAPI** | ✅ [Yes](https://europepmc.org/RestfulWebService) |
| **Auth** | None |
| **Rate limit** | Not officially documented |
| **Format** | JSON, XML |
| **Priority** | ⭐⭐ Medium |

**Strengths:**
- Aggregates PubMed + European sources
- Open Access full text
- Text-mining annotations
- Grant information

**Alpha construction:**
```bash
# Spec available but needs adaptation
curl -o specs/alpha/europepmc-raw.json \
  "https://www.ebi.ac.uk/europepmc/webservices/rest/swagger.json"

atlas-openapi-validator transform specs/alpha/europepmc-raw.json \
  --output specs/alpha/europepmc-2025-01.yaml \
  --format yaml \
  --set-stage alpha
```

**Documentation:** https://europepmc.org/RestfulWebService

---

### Unpaywall

| Aspect | Detail |
|--------|--------|
| **URL** | `https://api.unpaywall.org/v2/` |
| **Operator** | OurResearch |
| **Coverage** | 30M+ DOIs with OA status |
| **OpenAPI** | ❌ No |
| **Auth** | Email required (parameter) |
| **Rate limit** | 100k req/day |
| **Format** | JSON |
| **Priority** | ⭐⭐⭐ High |

**Strengths:**
- Finds Open Access versions
- Easy integration (by DOI)
- License data
- Direct PDF URLs

**Alpha construction:**
```bash
# Build from documentation + inference
atlas-openapi-validator scaffold \
  --name unpaywall \
  --base-url https://api.unpaywall.org/v2 \
  --output specs/alpha/unpaywall-2025-01.yaml

# Single simple endpoint
# GET /{doi}?email=your@email.com

atlas-openapi-validator infer \
  --base-url https://api.unpaywall.org/v2 \
  --endpoints "/{doi}" \
  --sample-dois "10.1038/nature12373,10.1126/science.1157784" \
  --params "email=test@example.com" \
  --merge-into specs/alpha/unpaywall-2025-01.yaml
```

**Documentation:** https://unpaywall.org/products/api

**Example spec:**
```yaml
openapi: '3.1.0'
info:
  title: Unpaywall API
  version: '2'
  x-atlas-metadata:
    stage: alpha
    origin:
      type: documentation
      urls:
        - https://unpaywall.org/products/api

servers:
  - url: https://api.unpaywall.org/v2

paths:
  /{doi}:
    get:
      operationId: getByDoi
      parameters:
        - name: doi
          in: path
          required: true
          schema:
            type: string
          example: '10.1038/nature12373'
        - name: email
          in: query
          required: true
          schema:
            type: string
            format: email
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Work'

components:
  schemas:
    Work:
      type: object
      properties:
        doi:
          type: string
        is_oa:
          type: boolean
        oa_status:
          type: string
          enum: [gold, green, hybrid, bronze, closed]
        best_oa_location:
          $ref: '#/components/schemas/OaLocation'
        oa_locations:
          type: array
          items:
            $ref: '#/components/schemas/OaLocation'

    OaLocation:
      type: object
      properties:
        url:
          type: string
          format: uri
        url_for_pdf:
          type: string
          format: uri
          nullable: true
        host_type:
          type: string
          enum: [publisher, repository]
        license:
          type: string
          nullable: true
        version:
          type: string
          enum: [publishedVersion, acceptedVersion, submittedVersion]
```

---

### OpenCitations

| Aspect | Detail |
|--------|--------|
| **URL** | `https://opencitations.net/` |
| **Operator** | University of Bologna |
| **Coverage** | 1.4B+ citations |
| **OpenAPI** | ✅ [Yes](https://opencitations.net/index/api/v2) |
| **Auth** | None |
| **Rate limit** | Not documented |
| **Format** | JSON, CSV |
| **Priority** | ⭐⭐⭐ High |

**Strengths:**
- Open citation graph
- COCI (Crossref), POCI (PubMed) data
- Simple REST API
- Bulk download available

**Alpha construction:**
```bash
# API documentation available
atlas-openapi-validator scaffold \
  --name opencitations \
  --base-url https://opencitations.net/index/api/v2 \
  --from-docs https://opencitations.net/index/api/v2 \
  --output specs/alpha/opencitations-2025-01.yaml

# Main endpoints
# - /references/{doi} : Outgoing citations
# - /citations/{doi} : Incoming citations
# - /metadata/{doi} : Metadata
```

**Documentation:** https://opencitations.net/index/api/v2

---

### DataCite

| Aspect | Detail |
|--------|--------|
| **URL** | `https://api.datacite.org/` |
| **Operator** | DataCite |
| **Coverage** | 50M+ DOIs (datasets, software) |
| **OpenAPI** | ✅ [Yes](https://api.datacite.org/) |
| **Auth** | None (read) |
| **Rate limit** | Not documented |
| **Format** | JSON:API |
| **Priority** | ⭐⭐ Medium |

**Strengths:**
- DOIs for research data
- DataCite Schema metadata
- Data-publications links
- Usage statistics

**Alpha construction:**
```bash
# OpenAPI spec available
atlas-openapi-validator fetch \
  https://api.datacite.org/openapi \
  --output specs/alpha/datacite-2025-01.yaml \
  --set-stage alpha

# Note: JSON:API format, requires adaptation
```

**Documentation:** https://support.datacite.org/docs/api

---

### DOAJ (Directory of Open Access Journals)

| Aspect | Detail |
|--------|--------|
| **URL** | `https://doaj.org/api/` |
| **Operator** | DOAJ |
| **Coverage** | 20k+ OA journals, 9M+ articles |
| **OpenAPI** | ✅ [Yes](https://doaj.org/api/docs) |
| **Auth** | API key for write |
| **Rate limit** | Not documented |
| **Format** | JSON |
| **Priority** | ⭐⭐ Medium |

**Strengths:**
- Reference for Open Access journals
- DOAJ quality criteria
- Detailed journal metadata
- APC status (publication fees)

**Alpha construction:**
```bash
# Swagger available
atlas-openapi-validator fetch \
  https://doaj.org/api/docs/swagger.json \
  --output specs/alpha/doaj-2025-01.yaml \
  --set-stage alpha
```

**Documentation:** https://doaj.org/api/docs

---

### Zenodo

| Aspect | Detail |
|--------|--------|
| **URL** | `https://zenodo.org/api/` |
| **Operator** | CERN |
| **Coverage** | 3M+ records (data, software, publications) |
| **OpenAPI** | ✅ [Yes](https://developers.zenodo.org/) |
| **Auth** | Token for write |
| **Rate limit** | 60 req/min (anonymous), 100 req/min (auth) |
| **Format** | JSON |
| **Priority** | ⭐⭐ Medium |

**Strengths:**
- General European repository
- Automatic versioning
- GitHub integration
- Automatic DOIs

**Alpha construction:**
```bash
# Spec available
atlas-openapi-validator fetch \
  https://zenodo.org/api/swagger.json \
  --output specs/alpha/zenodo-2025-01.yaml \
  --set-stage alpha
```

**Documentation:** https://developers.zenodo.org/

---

## Specialized Sources (Free)

### DBLP (Computer Science)

| Aspect | Detail |
|--------|--------|
| **URL** | `https://dblp.org/` |
| **Operator** | Schloss Dagstuhl |
| **Coverage** | 6M+ CS publications |
| **OpenAPI** | ❌ No |
| **Auth** | None |
| **Rate limit** | Not documented |
| **Format** | XML, JSON |
| **Priority** | ⭐⭐ Medium (CS) |

**Strengths:**
- Reference in computer science
- Very complete conference data
- Excellent author disambiguation
- Simple API

**Alpha construction:**
```bash
# Build from documentation
atlas-openapi-validator scaffold \
  --name dblp \
  --base-url https://dblp.org \
  --output specs/alpha/dblp-2025-01.yaml

# Endpoints
# - /search/publ/api : Publication search
# - /search/author/api : Author search
# - /pid/{pid}.xml : Publication by ID

atlas-openapi-validator infer \
  --base-url https://dblp.org \
  --endpoints /search/publ/api,/search/author/api \
  --response-format json \
  --sample-size 50 \
  --merge-into specs/alpha/dblp-2025-01.yaml
```

**Documentation:** https://dblp.org/faq/How+to+use+the+dblp+search+API.html

---

### RePEc (Economics)

| Aspect | Detail |
|--------|--------|
| **URL** | `https://ideas.repec.org/api.html` |
| **Operator** | RePEc |
| **Coverage** | 4M+ economics working papers |
| **OpenAPI** | ❌ No |
| **Auth** | None |
| **Rate limit** | Not documented |
| **Format** | JSON, XML |
| **Priority** | ⭐ Low (specialized) |

**Strengths:**
- Reference in economics
- Working papers and preprints
- Author/institution rankings
- Citations

**Alpha construction:**
```bash
# Limited API, mainly structured scraping
atlas-openapi-validator scaffold \
  --name repec \
  --base-url https://api.repec.org \
  --output specs/alpha/repec-2025-01.yaml

# Very limited documentation
```

**Documentation:** https://ideas.repec.org/api.html

---

### SSRN (Social Sciences)

| Aspect | Detail |
|--------|--------|
| **URL** | `https://www.ssrn.com/` |
| **Operator** | Elsevier |
| **Coverage** | 1M+ social sciences preprints |
| **OpenAPI** | ❌ No |
| **Auth** | Account required |
| **Rate limit** | Strict (anti-scraping) |
| **Format** | HTML (no public API) |
| **Priority** | ⭐ Low |

**Strengths:**
- Social sciences/law/economics preprints
- High downloads

**Alpha construction:**
```
⚠️ No official public API
Options:
1. Access via OpenAlex/Crossref (metadata)
2. Negotiate institutional access
3. Not recommended for atlas-citations
```

---

### bioRxiv / medRxiv

| Aspect | Detail |
|--------|--------|
| **URL** | `https://api.biorxiv.org/` |
| **Operator** | Cold Spring Harbor Laboratory |
| **Coverage** | 250k+ biology/medicine preprints |
| **OpenAPI** | ❌ No |
| **Auth** | None |
| **Rate limit** | Not documented |
| **Format** | JSON |
| **Priority** | ⭐⭐ Medium |

**Strengths:**
- Biology/medicine preprints
- Exhaustive COVID-19 data
- Links to final publications
- Simple and documented API

**Alpha construction:**
```bash
# Documented API but no spec
atlas-openapi-validator scaffold \
  --name biorxiv \
  --base-url https://api.biorxiv.org \
  --output specs/alpha/biorxiv-2025-01.yaml

# Endpoints
# - /details/{server}/{interval} : Details by period
# - /pubs/{server}/{interval} : Publications
# - /publisher/{prefix}/{interval} : By publisher

atlas-openapi-validator infer \
  --base-url https://api.biorxiv.org \
  --endpoints /details/biorxiv/2024-01-01/2024-01-31 \
  --sample-size 100 \
  --merge-into specs/alpha/biorxiv-2025-01.yaml
```

**Documentation:** https://api.biorxiv.org/

**Example spec:**
```yaml
openapi: '3.1.0'
info:
  title: bioRxiv/medRxiv API
  version: '2025-01'

servers:
  - url: https://api.biorxiv.org

paths:
  /details/{server}/{interval}:
    get:
      operationId: getDetails
      parameters:
        - name: server
          in: path
          required: true
          schema:
            type: string
            enum: [biorxiv, medrxiv]
        - name: interval
          in: path
          required: true
          description: Date range (YYYY-MM-DD/YYYY-MM-DD) or cursor
          schema:
            type: string
        - name: cursor
          in: query
          schema:
            type: integer
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DetailsResponse'

components:
  schemas:
    DetailsResponse:
      type: object
      properties:
        collection:
          type: array
          items:
            $ref: '#/components/schemas/Preprint'
        messages:
          type: array
          items:
            type: object
            properties:
              status:
                type: string
              count:
                type: integer
              total:
                type: integer

    Preprint:
      type: object
      properties:
        doi:
          type: string
        title:
          type: string
        authors:
          type: string
        author_corresponding:
          type: string
        author_corresponding_institution:
          type: string
        date:
          type: string
          format: date
        version:
          type: string
        type:
          type: string
        license:
          type: string
        category:
          type: string
        jatsxml:
          type: string
          format: uri
        abstract:
          type: string
        published:
          type: string
          description: DOI of published version if exists
```

---

## Regional Sources

### CNKI (China National Knowledge Infrastructure)

| Aspect | Detail |
|--------|--------|
| **URL** | `https://www.cnki.net/` |
| **Operator** | Tsinghua University |
| **Coverage** | Chinese publications |
| **OpenAPI** | ❌ No |
| **Auth** | Institutional subscription |
| **Rate limit** | Strict |
| **Format** | Proprietary |
| **Priority** | ⭐ Low |

**Alpha construction:**
```
⚠️ No public API
Access only via institutional subscription
Not recommended for atlas-citations open source
```

---

### CiNii (Japan)

| Aspect | Detail |
|--------|--------|
| **URL** | `https://cir.nii.ac.jp/` |
| **Operator** | NII (Japan) |
| **Coverage** | Japanese publications |
| **OpenAPI** | ⚠️ [Partial](https://cir.nii.ac.jp/articles) |
| **Auth** | Free API key |
| **Rate limit** | Not documented |
| **Format** | JSON, RDF |
| **Priority** | ⭐ Low |

**Alpha construction:**
```bash
# Documented API
atlas-openapi-validator scaffold \
  --name cinii \
  --base-url https://cir.nii.ac.jp \
  --output specs/alpha/cinii-2025-01.yaml

# Requires registration for API key
```

**Documentation:** https://support.nii.ac.jp/en/cir/api/a_opensearch

---

### SciELO (Latin America)

| Aspect | Detail |
|--------|--------|
| **URL** | `https://search.scielo.org/` |
| **Operator** | FAPESP (Brazil) |
| **Coverage** | Latin American publications |
| **OpenAPI** | ❌ No |
| **Auth** | None |
| **Rate limit** | Not documented |
| **Format** | JSON |
| **Priority** | ⭐ Low |

**Alpha construction:**
```bash
# Solr-based API
atlas-openapi-validator scaffold \
  --name scielo \
  --base-url https://search.scielo.org/api/v1 \
  --output specs/alpha/scielo-2025-01.yaml

atlas-openapi-validator infer \
  --base-url https://search.scielo.org/api/v1 \
  --sample-size 50 \
  --merge-into specs/alpha/scielo-2025-01.yaml
```

---

### CORE (UK Aggregator)

| Aspect | Detail |
|--------|--------|
| **URL** | `https://api.core.ac.uk/v3/` |
| **Operator** | Open University (UK) |
| **Coverage** | 300M+ Open Access articles |
| **OpenAPI** | ✅ [Yes](https://api.core.ac.uk/docs/v3) |
| **Auth** | Free API key |
| **Rate limit** | 10 req/sec |
| **Format** | JSON |
| **Priority** | ⭐⭐ Medium |

**Strengths:**
- Massive OA aggregator
- Full text available
- Enriched metadata
- Well-documented API

**Alpha construction:**
```bash
# OpenAPI spec available
atlas-openapi-validator fetch \
  https://api.core.ac.uk/docs/v3/openapi.json \
  --output specs/alpha/core-2025-01.yaml \
  --set-stage alpha
```

**Documentation:** https://api.core.ac.uk/docs/v3

---

## Paid Sources

### Scopus (Elsevier)

| Aspect | Detail |
|--------|--------|
| **URL** | `https://api.elsevier.com/` |
| **Operator** | Elsevier |
| **Coverage** | 90M+ records, citations |
| **OpenAPI** | ✅ [Yes](https://dev.elsevier.com/) |
| **Auth** | API key (subscription) |
| **Rate limit** | Variable by tier |
| **Format** | JSON, XML |
| **Priority** | 💰 Paid |

**Strengths:**
- Very complete citations
- h-index, metrics
- Exhaustive coverage
- Verified affiliations

**Alpha construction:**
```bash
# Requires institutional subscription
# Spec available via dev portal

atlas-openapi-validator fetch \
  https://dev.elsevier.com/api-docs \
  --output specs/alpha/scopus-2025-01.yaml \
  --set-stage alpha \
  --requires-auth

# Tests only with valid credentials
```

**Documentation:** https://dev.elsevier.com/documentation/

---

### Web of Science (Clarivate)

| Aspect | Detail |
|--------|--------|
| **URL** | `https://api.clarivate.com/apis/wos-starter/` |
| **Operator** | Clarivate |
| **Coverage** | 90M+ records, Impact Factor |
| **OpenAPI** | ✅ [Yes](https://developer.clarivate.com/) |
| **Auth** | API key (subscription) |
| **Rate limit** | Variable by tier |
| **Format** | JSON |
| **Priority** | 💰 Paid |

**Strengths:**
- Official Impact Factor
- Very reliable citations
- Historical coverage
- Journal rankings

**Alpha construction:**
```bash
# Requires subscription
atlas-openapi-validator fetch \
  https://developer.clarivate.com/apis/wos/swagger \
  --output specs/alpha/wos-2025-01.yaml \
  --set-stage alpha \
  --requires-auth
```

**Documentation:** https://developer.clarivate.com/apis/wos

---

### IEEE Xplore

| Aspect | Detail |
|--------|--------|
| **URL** | `https://ieeexploreapi.ieee.org/` |
| **Operator** | IEEE |
| **Coverage** | 6M+ engineering articles |
| **OpenAPI** | ✅ [Yes](https://developer.ieee.org/) |
| **Auth** | API key (subscription) |
| **Rate limit** | 200 req/day (free), more with subscription |
| **Format** | JSON, XML |
| **Priority** | 💰 Paid (limited free tier) |

**Strengths:**
- Reference in engineering/electronics
- IEEE standards
- Major conferences (CVPR, etc.)

**Alpha construction:**
```bash
# Free tier available (limited)
atlas-openapi-validator fetch \
  https://developer.ieee.org/docs/api \
  --output specs/alpha/ieee-2025-01.yaml \
  --set-stage alpha
```

**Documentation:** https://developer.ieee.org/

---

### Dimensions (Digital Science)

| Aspect | Detail |
|--------|--------|
| **URL** | `https://app.dimensions.ai/api/` |
| **Operator** | Digital Science |
| **Coverage** | 130M+ publications, grants, patents |
| **OpenAPI** | ⚠️ [DSL API](https://docs.dimensions.ai/dsl/) |
| **Auth** | API key (subscription) |
| **Rate limit** | Variable |
| **Format** | JSON |
| **Priority** | 💰 Paid |

**Strengths:**
- Publications-grants-patents links
- Integrated Altmetrics
- Funding data
- Clinical trials

**Alpha construction:**
```bash
# DSL (Domain Specific Language) API, not standard REST
# Requires specific adaptation

atlas-openapi-validator scaffold \
  --name dimensions \
  --base-url https://app.dimensions.ai/api \
  --output specs/alpha/dimensions-2025-01.yaml \
  --notes "DSL-based API, requires special handling"
```

**Documentation:** https://docs.dimensions.ai/dsl/

---

## Summary Table

| Source | OpenAPI | Free | Priority | Build Method |
|--------|---------|----------|----------|---------------------|
| **Semantic Scholar** | ✅ | ✅ | ⭐⭐⭐ | Fetch official |
| **PubMed** | ⚠️ | ✅ | ⭐⭐⭐ | Doc + inference |
| **Europe PMC** | ✅ | ✅ | ⭐⭐ | Fetch + adaptation |
| **Unpaywall** | ❌ | ✅ | ⭐⭐⭐ | Doc + inference |
| **OpenCitations** | ✅ | ✅ | ⭐⭐⭐ | Fetch official |
| **DataCite** | ✅ | ✅ | ⭐⭐ | Fetch (JSON:API) |
| **DOAJ** | ✅ | ✅ | ⭐⭐ | Fetch official |
| **Zenodo** | ✅ | ✅ | ⭐⭐ | Fetch official |
| **DBLP** | ❌ | ✅ | ⭐⭐ | Doc + inference |
| **RePEc** | ❌ | ✅ | ⭐ | Manual |
| **bioRxiv** | ❌ | ✅ | ⭐⭐ | Doc + inference |
| **CORE** | ✅ | ✅ | ⭐⭐ | Fetch official |
| **CiNii** | ⚠️ | ✅ | ⭐ | Doc + inference |
| **SciELO** | ❌ | ✅ | ⭐ | Solr inference |
| **Scopus** | ✅ | 💰 | 💰 | Fetch (auth) |
| **Web of Science** | ✅ | 💰 | 💰 | Fetch (auth) |
| **IEEE Xplore** | ✅ | 💰 | 💰 | Fetch (auth) |
| **Dimensions** | ⚠️ | 💰 | 💰 | DSL specific |
| **SSRN** | ❌ | 💰 | ❌ | Not recommended |
| **CNKI** | ❌ | 💰 | ❌ | Not recommended |

## Implementation Recommendation

### Phase 1 (Core - already planned)
1. OpenAlex
2. Crossref
3. HAL
4. ArXiv
5. ORCID

### Phase 2 (Priority extensions)
6. **Semantic Scholar** - Spec available, data-rich
7. **Unpaywall** - Simple, enriches OA
8. **OpenCitations** - Open citation graph

### Phase 3 (Specific domains)
9. **PubMed** - Essential for biomedicine
10. **bioRxiv/medRxiv** - Bio preprints
11. **DBLP** - CS reference

### Phase 4 (Aggregators)
12. **Europe PMC** - PubMed EU complement
13. **CORE** - OA full text
14. **DataCite** - Research data

### Paid sources (optional)
- Scopus, WoS, IEEE: according to institutional needs
