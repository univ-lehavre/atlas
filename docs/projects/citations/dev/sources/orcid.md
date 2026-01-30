# atlas-orcid

Effect client for the [ORCID](https://orcid.org/) API, the global registry of researcher identifiers.

## API Characteristics

| Aspect | Detail |
|--------|--------|
| Base URL | `https://pub.orcid.org/v3.0` |
| Format | JSON, XML |
| Auth | None (public API) or OAuth 2.0 (member API) |
| Rate limit | Variable by tier |
| API Versioning | **Yes** - v3.0 current |
| Official OpenAPI | **No** - "Unavailable until further notice" |

## Two Available APIs

### Public API (Free)

- Access to public data only
- No authentication required
- More restrictive rate limit

```bash
curl -H "Accept: application/json" \
  "https://pub.orcid.org/v3.0/0000-0002-1825-0097/record"
```

### Member API (Paid)

- Access to data based on permissions
- OAuth 2.0 authentication required
- Higher rate limit
- Write access possible

## Building the Alpha Spec

### Method: Documentation + Inference

The old ORCID Swagger is temporarily unavailable. The spec is built from documentation.

```bash
# 1. Create from documentation
atlas-openapi-validator scaffold \
  --name orcid \
  --base-url https://pub.orcid.org/v3.0 \
  --from-docs https://info.orcid.org/documentation/api-tutorials/ \
  --output specs/alpha/orcid-v3.0.yaml

# 2. Enrich by inference
atlas-openapi-validator infer \
  --base-url https://pub.orcid.org/v3.0 \
  --endpoints /{orcid}/record,/{orcid}/works,/{orcid}/employments \
  --sample-size 50 \
  --output specs/alpha/orcid-v3.0.yaml

# 3. Validate
atlas-openapi-validator validate specs/alpha/orcid-v3.0.yaml \
  --base-url https://pub.orcid.org/v3.0 \
  --output reports/orcid-alpha.json
```

### Documentation Sources

- [ORCID API Documentation](https://info.orcid.org/documentation/api-tutorials/)
- [ORCID API v3.0 Guide](https://info.orcid.org/documentation/api-tutorials/api-tutorial-read-data-on-a-record/)
- [ORCID Record Structure](https://info.orcid.org/documentation/integration-guide/orcid-record/)

## Spec Structure

```yaml
openapi: '3.1.0'
info:
  title: ORCID Public API
  version: '3.0'
  description: |
    ORCID public API to access researcher data.
    Returns public information from ORCID profiles.
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
      - Official Swagger temporarily unavailable
      - Spec built from documentation

servers:
  - url: https://pub.orcid.org/v3.0
    description: Public API v3.0
  - url: https://api.sandbox.orcid.org/v3.0
    description: Sandbox for testing

paths:
  /{orcid}/record:
    get:
      operationId: getRecord
      summary: Retrieve the complete profile
      parameters:
        - $ref: '#/components/parameters/orcid'
      responses:
        '200':
          description: Complete profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Record'
        '404':
          description: ORCID not found

  /{orcid}/person:
    get:
      operationId: getPerson
      summary: Personal data (name, bio)
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
      summary: Researcher publications
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
      summary: Publication detail
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
      summary: Positions/Affiliations
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
      summary: Education
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
      summary: Received funding
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
      summary: Review activities
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
      summary: Search ORCID profiles
      parameters:
        - name: q
          in: query
          required: true
          description: |
            Search query (Solr syntax).
            Fields: given-names, family-name, affiliation-org-name, etc.
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
      description: Internal element identifier
      schema:
        type: integer

  schemas:
    Record:
      type: object
      description: Complete ORCID profile
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

## ORCID iD Format

The ORCID identifier follows a strict format:

```
XXXX-XXXX-XXXX-XXXY

- X : digit 0-9
- Y : digit 0-9 or X (checksum)
- 16 characters + 3 hyphens
```

Valid examples:
- `0000-0002-1825-0097`
- `0000-0001-5109-3700`
- `0000-0002-1694-233X` (checksum X)

## Search Syntax

The search API uses Solr:

```bash
# By name
curl "https://pub.orcid.org/v3.0/search?q=family-name:curie"

# By affiliation
curl "https://pub.orcid.org/v3.0/search?q=affiliation-org-name:harvard"

# Combined
curl "https://pub.orcid.org/v3.0/search?q=given-names:marie+AND+family-name:curie"
```

### Search Fields

| Field | Description |
|-------|-------------|
| `given-names` | First name |
| `family-name` | Last name |
| `credit-name` | Credit name |
| `other-names` | Other names |
| `email` | Public email |
| `keyword` | Keywords |
| `affiliation-org-name` | Organization name |
| `ringgold-org-id` | Ringgold ID |
| `grid-org-id` | GRID ID |
| `orcid` | ORCID iD |
| `doi` | DOI of a publication |

## Effect Client

```typescript
interface OrcidConfig {
  baseUrl?: string;     // Default: https://pub.orcid.org/v3.0
  accessToken?: string; // For member API
}

interface OrcidClient {
  // Complete profile
  getRecord: (orcid: string) => Effect.Effect<Record, NotFoundError | OrcidError>;

  // Specific sections
  getPerson: (orcid: string) => Effect.Effect<Person, NotFoundError | OrcidError>;
  getWorks: (orcid: string) => Effect.Effect<Works, NotFoundError | OrcidError>;
  getWork: (orcid: string, putCode: number) => Effect.Effect<Work, NotFoundError | OrcidError>;
  getEmployments: (orcid: string) => Effect.Effect<Employments, NotFoundError | OrcidError>;
  getEducations: (orcid: string) => Effect.Effect<Educations, NotFoundError | OrcidError>;
  getFundings: (orcid: string) => Effect.Effect<Fundings, NotFoundError | OrcidError>;
  getPeerReviews: (orcid: string) => Effect.Effect<PeerReviews, NotFoundError | OrcidError>;

  // Search
  search: (query: string, options?: SearchOptions) =>
    Effect.Effect<SearchResults, OrcidError>;

  // Shortcuts
  searchByName: (givenName: string, familyName: string) =>
    Effect.Effect<SearchResults, OrcidError>;

  searchByAffiliation: (orgName: string) =>
    Effect.Effect<SearchResults, OrcidError>;

  // Validation
  isValidOrcid: (orcid: string) => boolean;
  formatOrcid: (orcid: string) => string; // Add hyphens if missing
}

interface SearchOptions {
  start?: number;
  rows?: number;   // Max 1000
}
```

## Validation

```bash
# Validate the spec
atlas-openapi-validator validate specs/alpha/orcid-v3.0.yaml \
  --base-url https://pub.orcid.org/v3.0 \
  --sample-size 20 \
  --output reports/orcid-alpha.json

# Test with known test ORCIDs
atlas-openapi-validator validate specs/alpha/orcid-v3.0.yaml \
  --base-url https://pub.orcid.org/v3.0 \
  --test-ids 0000-0002-1825-0097,0000-0001-5109-3700
```

## Versioning

ORCID has explicit API versioning. Specs follow this versioning:

```
specs/
├── alpha/
│   └── orcid-v3.0.yaml
├── stable/
│   └── orcid-v3.0.yaml
└── current.yaml -> stable/orcid-v3.0.yaml
```

When a new API version is released (e.g., v4.0):
1. Create `specs/alpha/orcid-v4.0.yaml`
2. Maintain `orcid-v3.0.yaml` for compatibility
3. Update `current.yaml` when v4.0 is stable

## Important Notes

1. **Public data only**: The public API only returns data marked as "public"
2. **Complex structure**: ORCID responses are highly nested
3. **put-code**: Internal identifier for each element (work, employment, etc.)
4. **Rate limiting**: Varies by usage, monitor response headers
5. **Sandbox**: Use `api.sandbox.orcid.org` for testing
