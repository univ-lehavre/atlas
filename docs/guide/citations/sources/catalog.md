# Catalogue des sources bibliographiques

Ce document recense toutes les sources académiques potentielles pour atlas-citations, avec leur état actuel et la stratégie de construction de leur spec OpenAPI.

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SOURCES BIBLIOGRAPHIQUES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRIORITÉ 1 (Implémentées)          PRIORITÉ 2 (Planifiées)                 │
│  ─────────────────────────          ────────────────────────                │
│  ✅ OpenAlex                        📋 Semantic Scholar                     │
│  ✅ Crossref                        📋 PubMed/NCBI                          │
│  ✅ HAL                             📋 Unpaywall                            │
│  ✅ ArXiv                           📋 OpenCitations                        │
│  ✅ ORCID                                                                    │
│                                                                              │
│  PRIORITÉ 3 (Extensions)            PRIORITÉ 4 (Spécialisées)               │
│  ───────────────────────            ─────────────────────────               │
│  📋 Europe PMC                      📋 DBLP                                 │
│  📋 DataCite                        📋 RePEc                                │
│  📋 DOAJ                            📋 SSRN                                 │
│  📋 Zenodo                          📋 bioRxiv/medRxiv                      │
│                                                                              │
│  SOURCES PAYANTES                   SOURCES RÉGIONALES                      │
│  ────────────────                   ──────────────────                      │
│  💰 Scopus                          🌍 CNKI (Chine)                         │
│  💰 Web of Science                  🌍 CiNii (Japon)                        │
│  💰 IEEE Xplore                     🌍 SciELO (Amérique latine)             │
│  💰 Dimensions                      🌍 CORE (UK)                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Légende

| Symbole | Signification |
|---------|---------------|
| ✅ | Implémentée (Priorité 1) |
| 📋 | Planifiée |
| 💰 | API payante |
| 🌍 | Source régionale |
| ✅ OpenAPI | Spec OpenAPI officielle disponible |
| ⚠️ OpenAPI | Spec partielle ou non maintenue |
| ❌ OpenAPI | Pas de spec OpenAPI |

---

## Sources académiques majeures (gratuites)

### Semantic Scholar

| Aspect | Détail |
|--------|--------|
| **URL** | `https://api.semanticscholar.org` |
| **Opérateur** | Allen Institute for AI |
| **Couverture** | 200M+ articles, toutes disciplines |
| **OpenAPI** | ✅ [Oui](https://api.semanticscholar.org/api-docs/) |
| **Auth** | API key recommandée (gratuite) |
| **Rate limit** | 100 req/5min (sans clé), 1 req/sec (avec clé) |
| **Format** | JSON |
| **Priorité** | ⭐⭐⭐ Haute |

**Points forts :**
- Graphe de citations très riche
- Embeddings SPECTER pour similarité sémantique
- Dataset S2ORC accessible
- Excellente couverture IA/ML

**Construction alpha :**
```bash
# Récupérer la spec OpenAPI officielle
atlas-openapi-validator fetch \
  https://api.semanticscholar.org/api-docs/openapi.json \
  --output specs/alpha/semantic-scholar-2025-01.yaml \
  --format yaml \
  --set-stage alpha

# Valider et adapter
atlas-openapi-validator validate specs/alpha/semantic-scholar-2025-01.yaml \
  --base-url https://api.semanticscholar.org/graph/v1 \
  --headers "x-api-key=${S2_API_KEY}" \
  --output reports/semantic-scholar-alpha.json
```

**Spec existante :** https://api.semanticscholar.org/api-docs/

---

### PubMed / NCBI E-utilities

| Aspect | Détail |
|--------|--------|
| **URL** | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/` |
| **Opérateur** | NIH / NLM |
| **Couverture** | 35M+ citations biomédicales |
| **OpenAPI** | ⚠️ [Partielle](https://www.ncbi.nlm.nih.gov/books/NBK25501/) |
| **Auth** | API key recommandée (gratuite) |
| **Rate limit** | 3 req/sec (sans clé), 10 req/sec (avec clé) |
| **Format** | XML, JSON (partiel) |
| **Priorité** | ⭐⭐⭐ Haute |

**Points forts :**
- Référence absolue en biomédecine
- MeSH terms pour classification
- Liens vers texte intégral (PMC)
- Données cliniques (ClinicalTrials.gov)

**Construction alpha :**
```bash
# Pas de spec OpenAPI complète, construction depuis documentation
atlas-openapi-validator scaffold \
  --name pubmed \
  --base-url https://eutils.ncbi.nlm.nih.gov/entrez/eutils \
  --output specs/alpha/pubmed-2025-01.yaml

# Endpoints principaux à documenter
# - esearch.fcgi : Recherche
# - efetch.fcgi : Récupération
# - einfo.fcgi : Métadonnées bases
# - elink.fcgi : Liens entre bases

# Inférer les schémas depuis réponses
atlas-openapi-validator infer \
  --base-url https://eutils.ncbi.nlm.nih.gov/entrez/eutils \
  --endpoints esearch.fcgi,efetch.fcgi \
  --params "db=pubmed&retmode=json" \
  --sample-size 50 \
  --merge-into specs/alpha/pubmed-2025-01.yaml
```

**Documentation :** https://www.ncbi.nlm.nih.gov/books/NBK25500/

---

### Europe PMC

| Aspect | Détail |
|--------|--------|
| **URL** | `https://www.ebi.ac.uk/europepmc/webservices/rest/` |
| **Opérateur** | EMBL-EBI |
| **Couverture** | 40M+ articles, focus Europe |
| **OpenAPI** | ✅ [Oui](https://europepmc.org/RestfulWebService) |
| **Auth** | Aucune |
| **Rate limit** | Non documenté officiellement |
| **Format** | JSON, XML |
| **Priorité** | ⭐⭐ Moyenne |

**Points forts :**
- Agrège PubMed + sources européennes
- Texte intégral Open Access
- Annotations text-mining
- Grant information

**Construction alpha :**
```bash
# Spec disponible mais nécessite adaptation
curl -o specs/alpha/europepmc-raw.json \
  "https://www.ebi.ac.uk/europepmc/webservices/rest/swagger.json"

atlas-openapi-validator transform specs/alpha/europepmc-raw.json \
  --output specs/alpha/europepmc-2025-01.yaml \
  --format yaml \
  --set-stage alpha
```

**Documentation :** https://europepmc.org/RestfulWebService

---

### Unpaywall

| Aspect | Détail |
|--------|--------|
| **URL** | `https://api.unpaywall.org/v2/` |
| **Opérateur** | OurResearch |
| **Couverture** | 30M+ DOIs avec statut OA |
| **OpenAPI** | ❌ Non |
| **Auth** | Email requis (paramètre) |
| **Rate limit** | 100k req/jour |
| **Format** | JSON |
| **Priorité** | ⭐⭐⭐ Haute |

**Points forts :**
- Trouve les versions Open Access
- Intégration facile (par DOI)
- Données de licence
- URLs PDF directs

**Construction alpha :**
```bash
# Construction depuis documentation + inférence
atlas-openapi-validator scaffold \
  --name unpaywall \
  --base-url https://api.unpaywall.org/v2 \
  --output specs/alpha/unpaywall-2025-01.yaml

# Endpoint unique simple
# GET /{doi}?email=your@email.com

atlas-openapi-validator infer \
  --base-url https://api.unpaywall.org/v2 \
  --endpoints "/{doi}" \
  --sample-dois "10.1038/nature12373,10.1126/science.1157784" \
  --params "email=test@example.com" \
  --merge-into specs/alpha/unpaywall-2025-01.yaml
```

**Documentation :** https://unpaywall.org/products/api

**Exemple de spec :**
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

| Aspect | Détail |
|--------|--------|
| **URL** | `https://opencitations.net/` |
| **Opérateur** | University of Bologna |
| **Couverture** | 1.4B+ citations |
| **OpenAPI** | ✅ [Oui](https://opencitations.net/index/api/v2) |
| **Auth** | Aucune |
| **Rate limit** | Non documenté |
| **Format** | JSON, CSV |
| **Priorité** | ⭐⭐⭐ Haute |

**Points forts :**
- Graphe de citations ouvert
- Données COCI (Crossref), POCI (PubMed)
- API REST simple
- Téléchargement bulk disponible

**Construction alpha :**
```bash
# Documentation API disponible
atlas-openapi-validator scaffold \
  --name opencitations \
  --base-url https://opencitations.net/index/api/v2 \
  --from-docs https://opencitations.net/index/api/v2 \
  --output specs/alpha/opencitations-2025-01.yaml

# Endpoints principaux
# - /references/{doi} : Citations sortantes
# - /citations/{doi} : Citations entrantes
# - /metadata/{doi} : Métadonnées
```

**Documentation :** https://opencitations.net/index/api/v2

---

### DataCite

| Aspect | Détail |
|--------|--------|
| **URL** | `https://api.datacite.org/` |
| **Opérateur** | DataCite |
| **Couverture** | 50M+ DOIs (datasets, logiciels) |
| **OpenAPI** | ✅ [Oui](https://api.datacite.org/) |
| **Auth** | Aucune (lecture) |
| **Rate limit** | Non documenté |
| **Format** | JSON:API |
| **Priorité** | ⭐⭐ Moyenne |

**Points forts :**
- DOIs pour données de recherche
- Métadonnées DataCite Schema
- Liens données-publications
- Statistiques d'usage

**Construction alpha :**
```bash
# Spec OpenAPI disponible
atlas-openapi-validator fetch \
  https://api.datacite.org/openapi \
  --output specs/alpha/datacite-2025-01.yaml \
  --set-stage alpha

# Attention : format JSON:API, nécessite adaptation
```

**Documentation :** https://support.datacite.org/docs/api

---

### DOAJ (Directory of Open Access Journals)

| Aspect | Détail |
|--------|--------|
| **URL** | `https://doaj.org/api/` |
| **Opérateur** | DOAJ |
| **Couverture** | 20k+ revues OA, 9M+ articles |
| **OpenAPI** | ✅ [Oui](https://doaj.org/api/docs) |
| **Auth** | API key pour écriture |
| **Rate limit** | Non documenté |
| **Format** | JSON |
| **Priorité** | ⭐⭐ Moyenne |

**Points forts :**
- Référence pour revues Open Access
- Critères qualité DOAJ
- Métadonnées revues détaillées
- Statut APC (frais publication)

**Construction alpha :**
```bash
# Swagger disponible
atlas-openapi-validator fetch \
  https://doaj.org/api/docs/swagger.json \
  --output specs/alpha/doaj-2025-01.yaml \
  --set-stage alpha
```

**Documentation :** https://doaj.org/api/docs

---

### Zenodo

| Aspect | Détail |
|--------|--------|
| **URL** | `https://zenodo.org/api/` |
| **Opérateur** | CERN |
| **Couverture** | 3M+ records (données, logiciels, publications) |
| **OpenAPI** | ✅ [Oui](https://developers.zenodo.org/) |
| **Auth** | Token pour écriture |
| **Rate limit** | 60 req/min (anonyme), 100 req/min (auth) |
| **Format** | JSON |
| **Priorité** | ⭐⭐ Moyenne |

**Points forts :**
- Dépôt généraliste européen
- Versioning automatique
- Intégration GitHub
- DOIs automatiques

**Construction alpha :**
```bash
# Spec disponible
atlas-openapi-validator fetch \
  https://zenodo.org/api/swagger.json \
  --output specs/alpha/zenodo-2025-01.yaml \
  --set-stage alpha
```

**Documentation :** https://developers.zenodo.org/

---

## Sources spécialisées (gratuites)

### DBLP (Computer Science)

| Aspect | Détail |
|--------|--------|
| **URL** | `https://dblp.org/` |
| **Opérateur** | Schloss Dagstuhl |
| **Couverture** | 6M+ publications CS |
| **OpenAPI** | ❌ Non |
| **Auth** | Aucune |
| **Rate limit** | Non documenté |
| **Format** | XML, JSON |
| **Priorité** | ⭐⭐ Moyenne (CS) |

**Points forts :**
- Référence en informatique
- Données conférences très complètes
- Désambiguïsation auteurs excellente
- API simple

**Construction alpha :**
```bash
# Construction depuis documentation
atlas-openapi-validator scaffold \
  --name dblp \
  --base-url https://dblp.org \
  --output specs/alpha/dblp-2025-01.yaml

# Endpoints
# - /search/publ/api : Recherche publications
# - /search/author/api : Recherche auteurs
# - /pid/{pid}.xml : Publication par ID

atlas-openapi-validator infer \
  --base-url https://dblp.org \
  --endpoints /search/publ/api,/search/author/api \
  --response-format json \
  --sample-size 50 \
  --merge-into specs/alpha/dblp-2025-01.yaml
```

**Documentation :** https://dblp.org/faq/How+to+use+the+dblp+search+API.html

---

### RePEc (Economics)

| Aspect | Détail |
|--------|--------|
| **URL** | `https://ideas.repec.org/api.html` |
| **Opérateur** | RePEc |
| **Couverture** | 4M+ working papers économie |
| **OpenAPI** | ❌ Non |
| **Auth** | Aucune |
| **Rate limit** | Non documenté |
| **Format** | JSON, XML |
| **Priorité** | ⭐ Basse (spécialisée) |

**Points forts :**
- Référence en économie
- Working papers et preprints
- Rankings auteurs/institutions
- Citations

**Construction alpha :**
```bash
# API limitée, principalement scraping structuré
atlas-openapi-validator scaffold \
  --name repec \
  --base-url https://api.repec.org \
  --output specs/alpha/repec-2025-01.yaml

# Documentation très limitée
```

**Documentation :** https://ideas.repec.org/api.html

---

### SSRN (Social Sciences)

| Aspect | Détail |
|--------|--------|
| **URL** | `https://www.ssrn.com/` |
| **Opérateur** | Elsevier |
| **Couverture** | 1M+ preprints sciences sociales |
| **OpenAPI** | ❌ Non |
| **Auth** | Compte requis |
| **Rate limit** | Strict (anti-scraping) |
| **Format** | HTML (pas d'API publique) |
| **Priorité** | ⭐ Basse |

**Points forts :**
- Preprints sciences sociales/droit/économie
- Téléchargements élevés

**Construction alpha :**
```
⚠️ Pas d'API publique officielle
Options :
1. Accès via OpenAlex/Crossref (métadonnées)
2. Négociation accès institutionnel
3. Non recommandé pour atlas-citations
```

---

### bioRxiv / medRxiv

| Aspect | Détail |
|--------|--------|
| **URL** | `https://api.biorxiv.org/` |
| **Opérateur** | Cold Spring Harbor Laboratory |
| **Couverture** | 250k+ preprints bio/médecine |
| **OpenAPI** | ❌ Non |
| **Auth** | Aucune |
| **Rate limit** | Non documenté |
| **Format** | JSON |
| **Priorité** | ⭐⭐ Moyenne |

**Points forts :**
- Preprints biologie/médecine
- Données COVID-19 exhaustives
- Liens vers publications finales
- API simple et documentée

**Construction alpha :**
```bash
# API documentée mais pas de spec
atlas-openapi-validator scaffold \
  --name biorxiv \
  --base-url https://api.biorxiv.org \
  --output specs/alpha/biorxiv-2025-01.yaml

# Endpoints
# - /details/{server}/{interval} : Détails par période
# - /pubs/{server}/{interval} : Publications
# - /publisher/{prefix}/{interval} : Par éditeur

atlas-openapi-validator infer \
  --base-url https://api.biorxiv.org \
  --endpoints /details/biorxiv/2024-01-01/2024-01-31 \
  --sample-size 100 \
  --merge-into specs/alpha/biorxiv-2025-01.yaml
```

**Documentation :** https://api.biorxiv.org/

**Exemple de spec :**
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

## Sources régionales

### CNKI (China National Knowledge Infrastructure)

| Aspect | Détail |
|--------|--------|
| **URL** | `https://www.cnki.net/` |
| **Opérateur** | Tsinghua University |
| **Couverture** | Publications chinoises |
| **OpenAPI** | ❌ Non |
| **Auth** | Abonnement institutionnel |
| **Rate limit** | Strict |
| **Format** | Propriétaire |
| **Priorité** | ⭐ Basse |

**Construction alpha :**
```
⚠️ Pas d'API publique
Accès uniquement via abonnement institutionnel
Non recommandé pour atlas-citations open source
```

---

### CiNii (Japan)

| Aspect | Détail |
|--------|--------|
| **URL** | `https://cir.nii.ac.jp/` |
| **Opérateur** | NII (Japan) |
| **Couverture** | Publications japonaises |
| **OpenAPI** | ⚠️ [Partielle](https://cir.nii.ac.jp/articles) |
| **Auth** | API key gratuite |
| **Rate limit** | Non documenté |
| **Format** | JSON, RDF |
| **Priorité** | ⭐ Basse |

**Construction alpha :**
```bash
# API documentée
atlas-openapi-validator scaffold \
  --name cinii \
  --base-url https://cir.nii.ac.jp \
  --output specs/alpha/cinii-2025-01.yaml

# Nécessite inscription pour API key
```

**Documentation :** https://support.nii.ac.jp/en/cir/api/a_opensearch

---

### SciELO (Latin America)

| Aspect | Détail |
|--------|--------|
| **URL** | `https://search.scielo.org/` |
| **Opérateur** | FAPESP (Brazil) |
| **Couverture** | Publications Amérique latine |
| **OpenAPI** | ❌ Non |
| **Auth** | Aucune |
| **Rate limit** | Non documenté |
| **Format** | JSON |
| **Priorité** | ⭐ Basse |

**Construction alpha :**
```bash
# API basée sur Solr
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

| Aspect | Détail |
|--------|--------|
| **URL** | `https://api.core.ac.uk/v3/` |
| **Opérateur** | Open University (UK) |
| **Couverture** | 300M+ articles Open Access |
| **OpenAPI** | ✅ [Oui](https://api.core.ac.uk/docs/v3) |
| **Auth** | API key gratuite |
| **Rate limit** | 10 req/sec |
| **Format** | JSON |
| **Priorité** | ⭐⭐ Moyenne |

**Points forts :**
- Agrégateur OA massif
- Texte intégral disponible
- Métadonnées enrichies
- API bien documentée

**Construction alpha :**
```bash
# Spec OpenAPI disponible
atlas-openapi-validator fetch \
  https://api.core.ac.uk/docs/v3/openapi.json \
  --output specs/alpha/core-2025-01.yaml \
  --set-stage alpha
```

**Documentation :** https://api.core.ac.uk/docs/v3

---

## Sources payantes

### Scopus (Elsevier)

| Aspect | Détail |
|--------|--------|
| **URL** | `https://api.elsevier.com/` |
| **Opérateur** | Elsevier |
| **Couverture** | 90M+ records, citations |
| **OpenAPI** | ✅ [Oui](https://dev.elsevier.com/) |
| **Auth** | API key (abonnement) |
| **Rate limit** | Variable selon tier |
| **Format** | JSON, XML |
| **Priorité** | 💰 Payante |

**Points forts :**
- Citations très complètes
- h-index, métriques
- Couverture exhaustive
- Affiliations vérifiées

**Construction alpha :**
```bash
# Nécessite abonnement institutionnel
# Spec disponible via dev portal

atlas-openapi-validator fetch \
  https://dev.elsevier.com/api-docs \
  --output specs/alpha/scopus-2025-01.yaml \
  --set-stage alpha \
  --requires-auth

# Tests uniquement avec credentials valides
```

**Documentation :** https://dev.elsevier.com/documentation/

---

### Web of Science (Clarivate)

| Aspect | Détail |
|--------|--------|
| **URL** | `https://api.clarivate.com/apis/wos-starter/` |
| **Opérateur** | Clarivate |
| **Couverture** | 90M+ records, Impact Factor |
| **OpenAPI** | ✅ [Oui](https://developer.clarivate.com/) |
| **Auth** | API key (abonnement) |
| **Rate limit** | Variable selon tier |
| **Format** | JSON |
| **Priorité** | 💰 Payante |

**Points forts :**
- Impact Factor officiel
- Citations très fiables
- Couverture historique
- Journal rankings

**Construction alpha :**
```bash
# Nécessite abonnement
atlas-openapi-validator fetch \
  https://developer.clarivate.com/apis/wos/swagger \
  --output specs/alpha/wos-2025-01.yaml \
  --set-stage alpha \
  --requires-auth
```

**Documentation :** https://developer.clarivate.com/apis/wos

---

### IEEE Xplore

| Aspect | Détail |
|--------|--------|
| **URL** | `https://ieeexploreapi.ieee.org/` |
| **Opérateur** | IEEE |
| **Couverture** | 6M+ articles ingénierie |
| **OpenAPI** | ✅ [Oui](https://developer.ieee.org/) |
| **Auth** | API key (abonnement) |
| **Rate limit** | 200 req/jour (gratuit), plus avec abonnement |
| **Format** | JSON, XML |
| **Priorité** | 💰 Payante (tier gratuit limité) |

**Points forts :**
- Référence ingénierie/électronique
- Standards IEEE
- Conférences majeures (CVPR, etc.)

**Construction alpha :**
```bash
# Tier gratuit disponible (limité)
atlas-openapi-validator fetch \
  https://developer.ieee.org/docs/api \
  --output specs/alpha/ieee-2025-01.yaml \
  --set-stage alpha
```

**Documentation :** https://developer.ieee.org/

---

### Dimensions (Digital Science)

| Aspect | Détail |
|--------|--------|
| **URL** | `https://app.dimensions.ai/api/` |
| **Opérateur** | Digital Science |
| **Couverture** | 130M+ publications, grants, patents |
| **OpenAPI** | ⚠️ [DSL API](https://docs.dimensions.ai/dsl/) |
| **Auth** | API key (abonnement) |
| **Rate limit** | Variable |
| **Format** | JSON |
| **Priorité** | 💰 Payante |

**Points forts :**
- Liens publications-grants-patents
- Altmetrics intégrés
- Données de financement
- Clinical trials

**Construction alpha :**
```bash
# API DSL (Domain Specific Language), pas REST standard
# Nécessite adaptation spécifique

atlas-openapi-validator scaffold \
  --name dimensions \
  --base-url https://app.dimensions.ai/api \
  --output specs/alpha/dimensions-2025-01.yaml \
  --notes "DSL-based API, requires special handling"
```

**Documentation :** https://docs.dimensions.ai/dsl/

---

## Tableau récapitulatif

| Source | OpenAPI | Gratuite | Priorité | Méthode construction |
|--------|---------|----------|----------|---------------------|
| **Semantic Scholar** | ✅ | ✅ | ⭐⭐⭐ | Fetch officiel |
| **PubMed** | ⚠️ | ✅ | ⭐⭐⭐ | Doc + inférence |
| **Europe PMC** | ✅ | ✅ | ⭐⭐ | Fetch + adaptation |
| **Unpaywall** | ❌ | ✅ | ⭐⭐⭐ | Doc + inférence |
| **OpenCitations** | ✅ | ✅ | ⭐⭐⭐ | Fetch officiel |
| **DataCite** | ✅ | ✅ | ⭐⭐ | Fetch (JSON:API) |
| **DOAJ** | ✅ | ✅ | ⭐⭐ | Fetch officiel |
| **Zenodo** | ✅ | ✅ | ⭐⭐ | Fetch officiel |
| **DBLP** | ❌ | ✅ | ⭐⭐ | Doc + inférence |
| **RePEc** | ❌ | ✅ | ⭐ | Manuelle |
| **bioRxiv** | ❌ | ✅ | ⭐⭐ | Doc + inférence |
| **CORE** | ✅ | ✅ | ⭐⭐ | Fetch officiel |
| **CiNii** | ⚠️ | ✅ | ⭐ | Doc + inférence |
| **SciELO** | ❌ | ✅ | ⭐ | Inférence Solr |
| **Scopus** | ✅ | 💰 | 💰 | Fetch (auth) |
| **Web of Science** | ✅ | 💰 | 💰 | Fetch (auth) |
| **IEEE Xplore** | ✅ | 💰 | 💰 | Fetch (auth) |
| **Dimensions** | ⚠️ | 💰 | 💰 | DSL spécifique |
| **SSRN** | ❌ | 💰 | ❌ | Non recommandé |
| **CNKI** | ❌ | 💰 | ❌ | Non recommandé |

## Recommandation d'implémentation

### Phase 1 (Core - déjà planifié)
1. OpenAlex
2. Crossref
3. HAL
4. ArXiv
5. ORCID

### Phase 2 (Extensions prioritaires)
6. **Semantic Scholar** - Spec disponible, riche en données
7. **Unpaywall** - Simple, enrichit OA
8. **OpenCitations** - Graphe citations ouvert

### Phase 3 (Domaines spécifiques)
9. **PubMed** - Incontournable biomédecine
10. **bioRxiv/medRxiv** - Preprints bio
11. **DBLP** - Référence CS

### Phase 4 (Agrégateurs)
12. **Europe PMC** - Complément PubMed EU
13. **CORE** - Texte intégral OA
14. **DataCite** - Données de recherche

### Sources payantes (optionnelles)
- Scopus, WoS, IEEE : selon besoins institutionnels
