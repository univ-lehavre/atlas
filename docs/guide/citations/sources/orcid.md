# atlas-orcid

Client Effect pour l'API [ORCID](https://orcid.org/), registre mondial des identifiants de chercheurs.

## Caractéristiques de l'API

| Aspect | Détail |
|--------|--------|
| Base URL | `https://pub.orcid.org/v3.0` |
| Format | JSON, XML |
| Auth | Aucune (API publique) ou OAuth 2.0 (API membre) |
| Rate limit | Variable selon tier |
| Versioning API | **Oui** - v3.0 actuelle |
| OpenAPI officielle | **Non** - "Unavailable until further notice" |

## Deux APIs disponibles

### API Publique (gratuite)

- Accès aux données publiques uniquement
- Pas d'authentification requise
- Rate limit plus restrictif

```bash
curl -H "Accept: application/json" \
  "https://pub.orcid.org/v3.0/0000-0002-1825-0097/record"
```

### API Membre (payante)

- Accès aux données selon permissions
- Authentification OAuth 2.0 requise
- Rate limit plus élevé
- Écriture possible

## Construction de la spec alpha

### Méthode : Documentation + Inférence

L'ancien Swagger ORCID est temporairement indisponible. La spec est construite depuis la documentation.

```bash
# 1. Créer depuis la documentation
atlas-openapi-validator scaffold \
  --name orcid \
  --base-url https://pub.orcid.org/v3.0 \
  --from-docs https://info.orcid.org/documentation/api-tutorials/ \
  --output specs/alpha/orcid-v3.0.yaml

# 2. Enrichir par inférence
atlas-openapi-validator infer \
  --base-url https://pub.orcid.org/v3.0 \
  --endpoints /{orcid}/record,/{orcid}/works,/{orcid}/employments \
  --sample-size 50 \
  --output specs/alpha/orcid-v3.0.yaml

# 3. Valider
atlas-openapi-validator validate specs/alpha/orcid-v3.0.yaml \
  --base-url https://pub.orcid.org/v3.0 \
  --output reports/orcid-alpha.json
```

### Sources de documentation

- [ORCID API Documentation](https://info.orcid.org/documentation/api-tutorials/)
- [ORCID API v3.0 Guide](https://info.orcid.org/documentation/api-tutorials/api-tutorial-read-data-on-a-record/)
- [ORCID Record Structure](https://info.orcid.org/documentation/integration-guide/orcid-record/)

## Structure de la spec

```yaml
openapi: '3.1.0'
info:
  title: ORCID Public API
  version: '3.0'
  description: |
    API publique ORCID pour accéder aux données des chercheurs.
    Retourne les informations publiques des profils ORCID.
  contact:
    url: https://orcid.org/
  x-atlas-metadata:
    stage: alpha
    origin:
      type: documentation
      urls:
        - https://info.orcid.org/documentation/api-tutorials/
        - https://info.orcid.org/documentation/integration-guide/orcid-record/
    createdAt: '2025-01-24T10:00:00Z'
    notes:
      - Swagger officiel temporairement indisponible
      - Spec construite depuis documentation

servers:
  - url: https://pub.orcid.org/v3.0
    description: Public API v3.0
  - url: https://api.sandbox.orcid.org/v3.0
    description: Sandbox for testing

paths:
  /{orcid}/record:
    get:
      operationId: getRecord
      summary: Récupérer le profil complet
      parameters:
        - $ref: '#/components/parameters/orcid'
      responses:
        '200':
          description: Profil complet
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Record'
        '404':
          description: ORCID non trouvé

  /{orcid}/person:
    get:
      operationId: getPerson
      summary: Données personnelles (nom, bio)
      parameters:
        - $ref: '#/components/parameters/orcid'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Person'

  /{orcid}/works:
    get:
      operationId: getWorks
      summary: Publications du chercheur
      parameters:
        - $ref: '#/components/parameters/orcid'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Works'

  /{orcid}/work/{putCode}:
    get:
      operationId: getWork
      summary: Détail d'une publication
      parameters:
        - $ref: '#/components/parameters/orcid'
        - $ref: '#/components/parameters/putCode'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Work'

  /{orcid}/employments:
    get:
      operationId: getEmployments
      summary: Postes/Affiliations
      parameters:
        - $ref: '#/components/parameters/orcid'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Employments'

  /{orcid}/educations:
    get:
      operationId: getEducations
      summary: Formations
      parameters:
        - $ref: '#/components/parameters/orcid'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Educations'

  /{orcid}/fundings:
    get:
      operationId: getFundings
      summary: Financements reçus
      parameters:
        - $ref: '#/components/parameters/orcid'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Fundings'

  /{orcid}/peer-reviews:
    get:
      operationId: getPeerReviews
      summary: Activités de review
      parameters:
        - $ref: '#/components/parameters/orcid'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PeerReviews'

  /search:
    get:
      operationId: search
      summary: Rechercher des profils ORCID
      parameters:
        - name: q
          in: query
          required: true
          description: |
            Requête de recherche (syntaxe Solr).
            Champs : given-names, family-name, affiliation-org-name, etc.
          schema:
            type: string
          example: 'family-name:curie AND affiliation-org-name:paris'
        - name: start
          in: query
          schema:
            type: integer
            default: 0
        - name: rows
          in: query
          schema:
            type: integer
            maximum: 1000
            default: 100
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SearchResults'

components:
  parameters:
    orcid:
      name: orcid
      in: path
      required: true
      description: ORCID iD (format XXXX-XXXX-XXXX-XXXX)
      schema:
        type: string
        pattern: '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$'
      example: '0000-0002-1825-0097'

    putCode:
      name: putCode
      in: path
      required: true
      description: Identifiant interne de l'élément
      schema:
        type: integer

  schemas:
    Record:
      type: object
      description: Profil ORCID complet
      properties:
        orcid-identifier:
          $ref: '#/components/schemas/OrcidIdentifier'
        person:
          $ref: '#/components/schemas/Person'
        activities-summary:
          $ref: '#/components/schemas/ActivitiesSummary'

    OrcidIdentifier:
      type: object
      properties:
        uri:
          type: string
          format: uri
          example: 'https://orcid.org/0000-0002-1825-0097'
        path:
          type: string
          example: '0000-0002-1825-0097'
        host:
          type: string
          example: 'orcid.org'

    Person:
      type: object
      properties:
        name:
          $ref: '#/components/schemas/Name'
        biography:
          $ref: '#/components/schemas/Biography'
        researcher-urls:
          $ref: '#/components/schemas/ResearcherUrls'
        emails:
          $ref: '#/components/schemas/Emails'
        keywords:
          $ref: '#/components/schemas/Keywords'
        external-identifiers:
          $ref: '#/components/schemas/ExternalIdentifiers'

    Name:
      type: object
      properties:
        given-names:
          type: object
          properties:
            value:
              type: string
        family-name:
          type: object
          properties:
            value:
              type: string
        credit-name:
          type: object
          nullable: true
          properties:
            value:
              type: string
        visibility:
          type: string
          enum: [public, limited, private]

    Biography:
      type: object
      nullable: true
      properties:
        content:
          type: string
        visibility:
          type: string

    ResearcherUrls:
      type: object
      properties:
        researcher-url:
          type: array
          items:
            type: object
            properties:
              url-name:
                type: string
              url:
                type: object
                properties:
                  value:
                    type: string
                    format: uri

    Keywords:
      type: object
      properties:
        keyword:
          type: array
          items:
            type: object
            properties:
              content:
                type: string

    ExternalIdentifiers:
      type: object
      properties:
        external-identifier:
          type: array
          items:
            type: object
            properties:
              external-id-type:
                type: string
                description: Type (Scopus, ResearcherID, etc.)
              external-id-value:
                type: string
              external-id-url:
                type: object
                nullable: true
                properties:
                  value:
                    type: string
                    format: uri

    Emails:
      type: object
      properties:
        email:
          type: array
          items:
            type: object
            properties:
              email:
                type: string
                format: email
              primary:
                type: boolean
              verified:
                type: boolean
              visibility:
                type: string

    ActivitiesSummary:
      type: object
      properties:
        employments:
          $ref: '#/components/schemas/AffiliationGroup'
        educations:
          $ref: '#/components/schemas/AffiliationGroup'
        fundings:
          $ref: '#/components/schemas/FundingGroup'
        works:
          $ref: '#/components/schemas/WorkGroup'
        peer-reviews:
          $ref: '#/components/schemas/PeerReviewGroup'

    AffiliationGroup:
      type: object
      properties:
        affiliation-group:
          type: array
          items:
            type: object
            properties:
              summaries:
                type: array
                items:
                  $ref: '#/components/schemas/AffiliationSummary'

    AffiliationSummary:
      type: object
      properties:
        put-code:
          type: integer
        organization:
          $ref: '#/components/schemas/Organization'
        department-name:
          type: string
          nullable: true
        role-title:
          type: string
          nullable: true
        start-date:
          $ref: '#/components/schemas/FuzzyDate'
        end-date:
          $ref: '#/components/schemas/FuzzyDate'

    Organization:
      type: object
      properties:
        name:
          type: string
        address:
          type: object
          properties:
            city:
              type: string
            region:
              type: string
              nullable: true
            country:
              type: string
        disambiguated-organization:
          type: object
          nullable: true
          properties:
            disambiguated-organization-identifier:
              type: string
            disambiguation-source:
              type: string
              enum: [ROR, RINGGOLD, GRID, FUNDREF]

    FuzzyDate:
      type: object
      nullable: true
      properties:
        year:
          type: object
          properties:
            value:
              type: string
        month:
          type: object
          nullable: true
          properties:
            value:
              type: string
        day:
          type: object
          nullable: true
          properties:
            value:
              type: string

    Works:
      type: object
      properties:
        group:
          type: array
          items:
            $ref: '#/components/schemas/WorkGroup'

    WorkGroup:
      type: object
      properties:
        work-summary:
          type: array
          items:
            $ref: '#/components/schemas/WorkSummary'

    WorkSummary:
      type: object
      properties:
        put-code:
          type: integer
        title:
          type: object
          properties:
            title:
              type: object
              properties:
                value:
                  type: string
        type:
          type: string
          enum:
            - journal-article
            - conference-paper
            - book
            - book-chapter
            - report
            - thesis
            - preprint
            - other
        publication-date:
          $ref: '#/components/schemas/FuzzyDate'
        external-ids:
          $ref: '#/components/schemas/WorkExternalIds'
        journal-title:
          type: object
          nullable: true
          properties:
            value:
              type: string

    Work:
      allOf:
        - $ref: '#/components/schemas/WorkSummary'
        - type: object
          properties:
            citation:
              type: object
              nullable: true
              properties:
                citation-type:
                  type: string
                citation-value:
                  type: string
            short-description:
              type: string
              nullable: true
            contributors:
              type: object
              properties:
                contributor:
                  type: array
                  items:
                    type: object
                    properties:
                      contributor-orcid:
                        $ref: '#/components/schemas/OrcidIdentifier'
                      credit-name:
                        type: object
                        properties:
                          value:
                            type: string

    WorkExternalIds:
      type: object
      properties:
        external-id:
          type: array
          items:
            type: object
            properties:
              external-id-type:
                type: string
                enum: [doi, pmid, arxiv, handle, isbn, issn, other-id]
              external-id-value:
                type: string
              external-id-url:
                type: object
                nullable: true
                properties:
                  value:
                    type: string
                    format: uri
              external-id-relationship:
                type: string
                enum: [self, part-of]

    Employments:
      type: object
      properties:
        affiliation-group:
          type: array
          items:
            $ref: '#/components/schemas/AffiliationGroup'

    Educations:
      type: object
      properties:
        affiliation-group:
          type: array
          items:
            $ref: '#/components/schemas/AffiliationGroup'

    FundingGroup:
      type: object
      properties:
        funding-summary:
          type: array
          items:
            $ref: '#/components/schemas/FundingSummary'

    FundingSummary:
      type: object
      properties:
        put-code:
          type: integer
        title:
          type: object
          properties:
            title:
              type: object
              properties:
                value:
                  type: string
        type:
          type: string
          enum: [grant, contract, award, salary-award]
        organization:
          $ref: '#/components/schemas/Organization'
        start-date:
          $ref: '#/components/schemas/FuzzyDate'
        end-date:
          $ref: '#/components/schemas/FuzzyDate'
        amount:
          type: object
          nullable: true
          properties:
            value:
              type: string
            currency-code:
              type: string

    Fundings:
      type: object
      properties:
        group:
          type: array
          items:
            $ref: '#/components/schemas/FundingGroup'

    PeerReviewGroup:
      type: object
      properties:
        peer-review-summary:
          type: array
          items:
            $ref: '#/components/schemas/PeerReviewSummary'

    PeerReviewSummary:
      type: object
      properties:
        put-code:
          type: integer
        reviewer-role:
          type: string
          enum: [reviewer, editor, member, chair]
        review-type:
          type: string
          enum: [review, evaluation]
        completion-date:
          $ref: '#/components/schemas/FuzzyDate'
        convening-organization:
          $ref: '#/components/schemas/Organization'

    PeerReviews:
      type: object
      properties:
        group:
          type: array
          items:
            $ref: '#/components/schemas/PeerReviewGroup'

    SearchResults:
      type: object
      properties:
        num-found:
          type: integer
        result:
          type: array
          items:
            type: object
            properties:
              orcid-identifier:
                $ref: '#/components/schemas/OrcidIdentifier'
```

## Format ORCID iD

L'identifiant ORCID suit un format strict :

```
XXXX-XXXX-XXXX-XXXY

- X : chiffre 0-9
- Y : chiffre 0-9 ou X (checksum)
- 16 caractères + 3 tirets
```

Exemples valides :
- `0000-0002-1825-0097`
- `0000-0001-5109-3700`
- `0000-0002-1694-233X` (checksum X)

## Syntaxe de recherche

L'API de recherche utilise Solr :

```bash
# Par nom
curl "https://pub.orcid.org/v3.0/search?q=family-name:curie"

# Par affiliation
curl "https://pub.orcid.org/v3.0/search?q=affiliation-org-name:harvard"

# Combinée
curl "https://pub.orcid.org/v3.0/search?q=given-names:marie+AND+family-name:curie"
```

### Champs de recherche

| Champ | Description |
|-------|-------------|
| `given-names` | Prénom |
| `family-name` | Nom |
| `credit-name` | Nom d'usage |
| `other-names` | Autres noms |
| `email` | Email public |
| `keyword` | Mots-clés |
| `affiliation-org-name` | Nom d'organisation |
| `ringgold-org-id` | ID Ringgold |
| `grid-org-id` | ID GRID |
| `orcid` | ORCID iD |
| `doi` | DOI d'une publication |

## Client Effect

```typescript
interface OrcidConfig {
  baseUrl?: string;     // Default: https://pub.orcid.org/v3.0
  accessToken?: string; // Pour API membre
}

interface OrcidClient {
  // Profil complet
  getRecord: (orcid: string) => Effect.Effect<Record, NotFoundError | OrcidError>;

  // Sections spécifiques
  getPerson: (orcid: string) => Effect.Effect<Person, NotFoundError | OrcidError>;
  getWorks: (orcid: string) => Effect.Effect<Works, NotFoundError | OrcidError>;
  getWork: (orcid: string, putCode: number) => Effect.Effect<Work, NotFoundError | OrcidError>;
  getEmployments: (orcid: string) => Effect.Effect<Employments, NotFoundError | OrcidError>;
  getEducations: (orcid: string) => Effect.Effect<Educations, NotFoundError | OrcidError>;
  getFundings: (orcid: string) => Effect.Effect<Fundings, NotFoundError | OrcidError>;
  getPeerReviews: (orcid: string) => Effect.Effect<PeerReviews, NotFoundError | OrcidError>;

  // Recherche
  search: (query: string, options?: SearchOptions) =>
    Effect.Effect<SearchResults, OrcidError>;

  // Raccourcis
  searchByName: (givenName: string, familyName: string) =>
    Effect.Effect<SearchResults, OrcidError>;

  searchByAffiliation: (orgName: string) =>
    Effect.Effect<SearchResults, OrcidError>;

  // Validation
  isValidOrcid: (orcid: string) => boolean;
  formatOrcid: (orcid: string) => string; // Ajoute tirets si manquants
}

interface SearchOptions {
  start?: number;
  rows?: number;   // Max 1000
}
```

## Validation

```bash
# Valider la spec
atlas-openapi-validator validate specs/alpha/orcid-v3.0.yaml \
  --base-url https://pub.orcid.org/v3.0 \
  --sample-size 20 \
  --output reports/orcid-alpha.json

# Tester avec ORCID de test connus
atlas-openapi-validator validate specs/alpha/orcid-v3.0.yaml \
  --base-url https://pub.orcid.org/v3.0 \
  --test-ids 0000-0002-1825-0097,0000-0001-5109-3700
```

## Versioning

ORCID a un versioning d'API explicite. Les specs suivent ce versioning :

```
specs/
├── alpha/
│   └── orcid-v3.0.yaml
├── stable/
│   └── orcid-v3.0.yaml
└── current.yaml → stable/orcid-v3.0.yaml
```

Lorsqu'une nouvelle version d'API sort (ex: v4.0) :
1. Créer `specs/alpha/orcid-v4.0.yaml`
2. Maintenir `orcid-v3.0.yaml` pour compatibilité
3. Mettre à jour `current.yaml` quand v4.0 est stable

## Notes importantes

1. **Données publiques uniquement** : L'API publique ne retourne que les données marquées "public"
2. **Structure complexe** : Les réponses ORCID sont très imbriquées
3. **put-code** : Identifiant interne pour chaque élément (work, employment, etc.)
4. **Rate limiting** : Varie selon usage, surveiller les headers de réponse
5. **Sandbox** : Utiliser `api.sandbox.orcid.org` pour les tests
