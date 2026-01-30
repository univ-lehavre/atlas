# Entities and Fields Reference by Source

This document details the retrievable objects and their attributes for each bibliographic source.

## Table of Contents

- [Semantic Scholar](#semantic-scholar)
- [PubMed / NCBI](#pubmed--ncbi)
- [Europe PMC](#europe-pmc)
- [Unpaywall](#unpaywall)
- [OpenCitations](#opencitations)
- [DataCite](#datacite)
- [DOAJ](#doaj)
- [Zenodo](#zenodo)
- [DBLP](#dblp)
- [bioRxiv / medRxiv](#biorxiv--medrxiv)
- [CORE](#core)
- [Paid Sources](#paid-sources)

---

## Semantic Scholar

**Base URL:** `https://api.semanticscholar.org/graph/v1`

### Available Entities

| Entity | Endpoints | Description |
|--------|-----------|-------------|
| **Paper** | `/paper/{id}`, `/paper/search`, `/paper/batch` | Scientific publications |
| **Author** | `/author/{id}`, `/author/search`, `/author/batch` | Author profiles |
| **Citation** | `/paper/{id}/citations` | Incoming citations |
| **Reference** | `/paper/{id}/references` | Outgoing references |
| **Snippet** | `/snippet/search` | Text excerpts |

### Paper - Available Fields

| Field | Type | Description | Always Returned |
|-------|------|-------------|-------------------|
| `paperId` | string | Unique SHA identifier | ✅ |
| `title` | string | Article title | ✅ |
| `corpusId` | integer | Secondary numeric identifier | ❌ |
| `externalIds` | object | DOI, ArXiv, MAG, ACL, PMID, PMCID, DBLP | ❌ |
| `url` | string | Semantic Scholar page URL | ❌ |
| `abstract` | string | Abstract | ❌ |
| `venue` | string | Publication venue name | ❌ |
| `publicationVenue` | object | Venue details (id, name, type, URLs) | ❌ |
| `year` | integer | Publication year | ❌ |
| `publicationDate` | string | Full date (YYYY-MM-DD) | ❌ |
| `publicationTypes` | array | Classification (Review, JournalArticle, Conference) | ❌ |
| `referenceCount` | integer | Number of references | ❌ |
| `citationCount` | integer | Number of citations | ❌ |
| `influentialCitationCount` | integer | High-impact citations | ❌ |
| `isOpenAccess` | boolean | Open Access status | ❌ |
| `openAccessPdf` | object | PDF URL, status, license | ❌ |
| `fieldsOfStudy` | array | Academic categories | ❌ |
| `s2FieldsOfStudy` | array | Detailed classifications with sources | ❌ |
| `journal` | object | Name, volume, pages | ❌ |
| `citationStyles` | object | BibTeX format | ❌ |
| `authors` | array | Author list | ❌ |
| `citations` | array | Citing articles | ❌ |
| `references` | array | Cited articles | ❌ |
| `embedding` | object | SPECTER vector (v1 or v2) | ❌ |
| `tldr` | object | AI-generated summary | ❌ |

### Author - Available Fields

| Field | Type | Description | Always Returned |
|-------|------|-------------|-------------------|
| `authorId` | string | Unique identifier | ✅ |
| `name` | string | Full name | ✅ |
| `externalIds` | object | ORCID, DBLP | ❌ |
| `url` | string | S2 profile URL | ❌ |
| `affiliations` | array | Organizations | ❌ |
| `homepage` | string | Personal website | ❌ |
| `paperCount` | integer | Number of publications | ❌ |
| `citationCount` | integer | Total citations | ❌ |
| `hIndex` | integer | h-index | ❌ |
| `papers` | array | Publications | ❌ |

### Supported Identifiers

```
paperId (SHA), CorpusId:<id>, DOI:<doi>, ARXIV:<id>, MAG:<id>,
ACL:<id>, PMID:<id>, PMCID:<id>, URL:<url>
```

---

## PubMed / NCBI

**Base URL:** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`

### E-utilities Endpoints

| Endpoint | Function | Output |
|----------|----------|--------|
| `einfo.fcgi` | Database metadata | Database list, indexed fields |
| `esearch.fcgi` | Search | UIDs, count, query_key |
| `efetch.fcgi` | Retrieval | Complete records |
| `esummary.fcgi` | Summaries | DocSums (lightweight metadata) |
| `elink.fcgi` | Links | Linked UIDs, external links |
| `epost.fcgi` | Upload UIDs | Session History |
| `espell.fcgi` | Spell check | Suggestions |
| `ecitmatch.cgi` | Citation match | PMIDs |

### Main Databases

| Database | Content | Records |
|------|---------|---------|
| `pubmed` | Biomedical literature | 35M+ |
| `pmc` | Open Access full text | 8M+ |
| `gene` | Genes | - |
| `protein` | Proteins | - |
| `nucleotide` | DNA/RNA sequences | - |
| `taxonomy` | Taxonomy | - |
| `clinvar` | Clinical variants | - |

### PubMed Article - Available Fields

| Field | Description | Via |
|-------|-------------|-----|
| `PMID` | PubMed identifier | efetch |
| `Title` | Title | efetch, esummary |
| `Abstract` | Abstract | efetch |
| `AuthorList` | Authors (name, affiliation, ORCID) | efetch |
| `Journal` | Journal title, ISSN, volume, issue | efetch |
| `PubDate` | Publication date | efetch |
| `ArticleType` | Type (Review, Research, etc.) | efetch |
| `MeshHeadingList` | MeSH terms | efetch |
| `KeywordList` | Author keywords | efetch |
| `GrantList` | Funding | efetch |
| `ReferenceList` | Cited references | efetch |
| `DOI` | Digital Object Identifier | efetch |
| `PMC` | PubMed Central ID | elink |

### Output Formats

| Format | Parameter | Description |
|--------|-----------|-------------|
| XML PubMed | `rettype=xml` | Complete native format |
| MEDLINE | `rettype=medline` | Bibliographic format |
| Abstract | `rettype=abstract` | Plain text |
| JSON | `retmode=json` | For esearch, esummary |

---

## Europe PMC

**Base URL:** `https://www.ebi.ac.uk/europepmc/webservices/rest/`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/search` | Publication search |
| `/fields` | Available search fields |
| `/{source}/{id}/citations` | Incoming citations |
| `/{source}/{id}/references` | References |
| `/{source}/{id}/databaseLinks` | Database links |
| `/{source}/{id}/textMinedTerms` | Text-mining annotations |
| `/{id}/fullTextXML` | Full text XML |
| `/{id}/supplementaryFiles` | Supplementary files |

### Article - Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Identifier (PMID or PMC) |
| `source` | string | MED, PMC, PAT, etc. |
| `title` | string | Title |
| `authorString` | string | Formatted authors |
| `authorList` | array | Detailed authors |
| `journalTitle` | string | Journal title |
| `pubYear` | integer | Year |
| `abstractText` | string | Abstract |
| `doi` | string | DOI |
| `isOpenAccess` | boolean | OA status |
| `inEPMC` | boolean | Full text in EPMC |
| `citedByCount` | integer | Citation count |
| `hasReferences` | boolean | References available |
| `grantsList` | array | Funding |
| `meshHeadingList` | array | MeSH terms |
| `chemicalList` | array | Chemical substances |

### Text-mining Annotations

| Type | Description |
|------|-------------|
| `DISEASE` | Diseases |
| `GENE_PROTEIN` | Genes/Proteins |
| `ORGANISM` | Organisms |
| `CHEMICAL` | Chemical compounds |
| `GO_TERM` | Gene Ontology |

---

## Unpaywall

**Base URL:** `https://api.unpaywall.org/v2/`

### Single Endpoint

```
GET /{doi}?email=your@email.com
```

### Work - Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `doi` | string | DOI |
| `doi_url` | string | Resolved DOI URL |
| `title` | string | Title |
| `genre` | string | Type (journal-article, book-chapter, etc.) |
| `is_paratext` | boolean | Editorial content |
| `published_date` | string | Publication date |
| `year` | integer | Year |
| `journal_name` | string | Journal name |
| `journal_issns` | string | ISSNs |
| `journal_issn_l` | string | ISSN-L |
| `publisher` | string | Publisher |
| `is_oa` | boolean | **Open Access?** |
| `oa_status` | string | **gold, green, hybrid, bronze, closed** |
| `has_repository_copy` | boolean | Repository copy |
| `best_oa_location` | object | **Best OA location** |
| `first_oa_location` | object | First OA location |
| `oa_locations` | array | **All OA locations** |
| `oa_locations_embargoed` | array | Embargoed locations |
| `updated` | string | Last update |
| `data_standard` | integer | Data version |
| `z_authors` | array | Authors (via Crossref) |

### OA Location - Sub-object

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Page URL |
| `url_for_pdf` | string | Direct PDF URL |
| `url_for_landing_page` | string | Landing page |
| `host_type` | string | publisher, repository |
| `license` | string | CC-BY, CC-BY-NC, etc. |
| `version` | string | publishedVersion, acceptedVersion, submittedVersion |
| `evidence` | string | Detection source |
| `pmh_id` | string | OAI-PMH ID |
| `endpoint_id` | string | Endpoint ID |
| `repository_institution` | string | Repository institution |

---

## OpenCitations

**Base URL:** `https://api.opencitations.net/index/v2`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/citation/{oci}` | Citation by OCI |
| `/citations/{id}` | Incoming citations |
| `/references/{id}` | Outgoing references |
| `/citation-count/{id}` | Citation count |
| `/reference-count/{id}` | Reference count |

### Citation - Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `oci` | string | Open Citation Identifier |
| `citing` | string | Citing article IDs |
| `cited` | string | Cited article IDs |
| `creation` | string | Creation date (ISO 8601) |
| `timespan` | string | Time between publication (PnYnMnD) |
| `journal_sc` | string | Journal self-citation (yes/no) |
| `author_sc` | string | Author self-citation (yes/no) |

### Supported Identifiers

```
DOI, PMID, PMCID, OMID (OpenCitations ID), ISSN (for venues)
```

---

## DataCite

**Base URL:** `https://api.datacite.org/`

### Main Endpoints

| Endpoint | Description |
|----------|-------------|
| `/dois` | DOI search |
| `/dois/{doi}` | Specific DOI |
| `/clients` | Member organizations |
| `/providers` | Providers |

### DOI Record - Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `doi` | string | DOI |
| `prefix` | string | DOI prefix |
| `suffix` | string | Suffix |
| `identifiers` | array | Alternative identifiers |
| `creators` | array | Creators (name, affiliation, ORCID, ROR) |
| `titles` | array | Titles (main, alternative) |
| `publisher` | string | Publisher |
| `publicationYear` | integer | Year |
| `resourceType` | object | Type (Dataset, Software, etc.) |
| `subjects` | array | Subjects |
| `contributors` | array | Contributors |
| `dates` | array | Dates (created, issued, updated) |
| `language` | string | Language (ISO 639) |
| `types` | object | Resource types |
| `relatedIdentifiers` | array | Links to other resources |
| `sizes` | array | Sizes |
| `formats` | array | File formats |
| `version` | string | Version |
| `rights` | array | Licenses |
| `descriptions` | array | Descriptions |
| `geoLocations` | array | Geographic locations |
| `fundingReferences` | array | Funding |
| `url` | string | Landing page |
| `contentUrl` | string | Content URL |
| `xml` | string | XML metadata (Base64) |
| `viewCount` | integer | View count |
| `downloadCount` | integer | Downloads |
| `citationCount` | integer | Citations |
| `state` | string | findable, registered, draft |
| `created` | string | Creation date |
| `registered` | string | Registration date |
| `updated` | string | Last update |

---

## DOAJ

**Base URL:** `https://doaj.org/api/`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/search/articles/{query}` | Article search |
| `/search/journals/{query}` | Journal search |
| `/articles/{id}` | Article by ID |
| `/journals/{issn}` | Journal by ISSN |
| `/bulk/articles` | Batch article upload |

### Article (bibjson) - Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | DOAJ ID |
| `bibjson.title` | string | Title |
| `bibjson.identifier` | array | DOI, other IDs |
| `bibjson.journal.title` | string | Journal title |
| `bibjson.journal.issns` | array | ISSNs |
| `bibjson.journal.publisher` | string | Publisher |
| `bibjson.journal.country` | string | Country |
| `bibjson.author` | array | Authors |
| `bibjson.abstract` | string | Abstract |
| `bibjson.keywords` | array | Keywords |
| `bibjson.year` | string | Year |
| `bibjson.month` | string | Month |
| `bibjson.start_page` | string | Start page |
| `bibjson.end_page` | string | End page |
| `bibjson.link` | array | Links (PDF, HTML, ePUB, XML) |
| `bibjson.subject` | array | Subjects |
| `created_date` | string | Creation date |
| `last_updated` | string | Last update |

### Journal (bibjson) - Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | DOAJ ID |
| `bibjson.title` | string | Title |
| `bibjson.alternative_title` | string | Alternative title |
| `bibjson.identifier` | array | pISSN, eISSN |
| `bibjson.publisher` | object | Publisher, country |
| `bibjson.institution` | object | Institution |
| `bibjson.oa_start` | integer | OA start year |
| `bibjson.apc` | object | Publication fees |
| `bibjson.license` | array | Licenses |
| `bibjson.subject` | array | Subjects |
| `bibjson.language` | array | Languages |
| `bibjson.ref.aims_scope` | string | Aims and scope URL |
| `bibjson.ref.author_instructions` | string | Author instructions URL |

---

## Zenodo

**Base URL:** `https://zenodo.org/api/`

### Main Endpoints

| Endpoint | Description |
|----------|-------------|
| `/records` | Published records search |
| `/records/{id}` | Specific record |
| `/deposit/depositions` | Deposit management |
| `/licenses` | Available licenses |
| `/communities` | Communities |

### Record - Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Zenodo ID |
| `doi` | string | DOI |
| `doi_url` | string | DOI URL |
| `conceptdoi` | string | Concept DOI (all versions) |
| `conceptrecid` | integer | Concept ID |
| `created` | string | Creation date |
| `modified` | string | Last modification |
| `metadata.title` | string | Title |
| `metadata.description` | string | Description (HTML) |
| `metadata.upload_type` | string | publication, dataset, software, etc. |
| `metadata.publication_type` | string | article, preprint, thesis, etc. |
| `metadata.publication_date` | string | Publication date |
| `metadata.creators` | array | Creators (name, affiliation, orcid, gnd) |
| `metadata.contributors` | array | Contributors |
| `metadata.keywords` | array | Keywords |
| `metadata.subjects` | array | Controlled subjects |
| `metadata.related_identifiers` | array | Related identifiers |
| `metadata.grants` | array | Funding |
| `metadata.communities` | array | Communities |
| `metadata.license` | object | License |
| `metadata.access_right` | string | open, embargoed, restricted, closed |
| `metadata.embargo_date` | string | Embargo end date |
| `metadata.journal.title` | string | Journal (if article) |
| `metadata.journal.volume` | string | Volume |
| `metadata.journal.issue` | string | Issue |
| `metadata.journal.pages` | string | Pages |
| `metadata.conference.title` | string | Conference |
| `metadata.conference.dates` | string | Conference dates |
| `metadata.conference.place` | string | Location |
| `metadata.conference.url` | string | Conference URL |
| `metadata.imprint.publisher` | string | Publisher |
| `metadata.imprint.isbn` | string | ISBN |
| `metadata.thesis.university` | string | University |
| `metadata.thesis.supervisors` | array | Supervisors |
| `metadata.version` | string | Version |
| `metadata.language` | string | Language (ISO 639-3) |
| `metadata.locations` | array | Geo locations |
| `metadata.dates` | array | Additional dates |
| `metadata.method` | string | Methodology |
| `files` | array | Files (id, filename, size, checksum) |
| `owners` | array | Owners |
| `stats` | object | Statistics (views, downloads) |

---

## DBLP

**Base URL:** `https://dblp.org/`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/search/publ/api` | Publication search |
| `/search/author/api` | Author search |
| `/search/venue/api` | Venue search |
| `/pid/{pid}.xml` | Publication by ID |
| `/rec/{key}.xml` | Record by key |

### Publication - Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Unique DBLP key |
| `title` | string | Title |
| `authors` | array | Authors |
| `venue` | string | Conference/Journal |
| `year` | integer | Year |
| `type` | string | article, inproceedings, book, etc. |
| `doi` | string | DOI |
| `ee` | string | Electronic URL |
| `url` | string | DBLP URL |
| `pages` | string | Pages |
| `volume` | string | Volume |
| `number` | string | Issue |

### Author - Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `pid` | string | Person ID |
| `name` | string | Name |
| `aliases` | array | Alternative names |
| `url` | string | Profile URL |
| `affiliations` | array | Affiliations |
| `notes` | array | Notes |

### Venue - Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `venue` | string | Full name |
| `acronym` | string | Acronym |
| `type` | string | journal, conference, workshop |
| `url` | string | DBLP URL |

---

## bioRxiv / medRxiv

**Base URL:** `https://api.biorxiv.org/`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/details/{server}/{interval}` | Metadata by period |
| `/pubs/{server}/{interval}` | Published preprints |
| `/pub/{interval}` | Publications (bioRxiv) |
| `/publisher/{prefix}/{interval}` | By publisher |
| `/funder/{server}/{interval}/{ror}` | By funder |
| `/sum/{interval}` | Statistics |
| `/usage/{interval}/{server}` | Usage metrics |

### Preprint - Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `doi` | string | Preprint DOI |
| `title` | string | Title |
| `authors` | string | Authors (text format) |
| `author_corresponding` | string | Corresponding author |
| `author_corresponding_institution` | string | Corresponding institution |
| `date` | string | Publication date |
| `version` | string | Version (1, 2, etc.) |
| `type` | string | Preprint type |
| `license` | string | License |
| `category` | string | Scientific category |
| `jatsxml` | string | JATS XML URL |
| `abstract` | string | Abstract |
| `published` | string | Published version DOI |
| `server` | string | biorxiv or medrxiv |

### Published Preprint - Additional Fields

| Field | Type | Description |
|-------|------|-------------|
| `biorxiv_doi` | string | Preprint DOI |
| `published_doi` | string | Published DOI |
| `published_journal` | string | Publication journal |
| `published_date` | string | Publication date |
| `preprint_platform` | string | Origin platform |

### Funder Data - Additional Fields

| Field | Type | Description |
|-------|------|-------------|
| `funding.name` | string | Funder name |
| `funding.id` | string | Funder ID |
| `funding.id-type` | string | ID type (ROR, Crossref) |
| `funding.award` | string | Grant number |

### Usage Statistics

| Field | Type | Description |
|-------|------|-------------|
| `month` | string | Month |
| `abstract_views` | integer | Abstract views |
| `full_text_views` | integer | Full text views |
| `pdf_downloads` | integer | PDF downloads |
| `*_cumulative` | integer | Cumulative totals |

---

## CORE

**Base URL:** `https://api.core.ac.uk/v3/`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/search/works` | Works search (deduplicated) |
| `/search/outputs` | Outputs search (raw) |
| `/search/data-providers` | Provider search |
| `/search/journals` | Journal search |
| `/works/{id}` | Specific work |
| `/outputs/{id}` | Specific output |
| `/outputs/{id}/download` | PDF download |

### Work - Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | CORE ID |
| `doi` | string | DOI |
| `title` | string | Title |
| `abstract` | string | Abstract |
| `authors` | array | Authors |
| `contributors` | array | Contributors |
| `publisher` | string | Publisher |
| `journals` | array | Journals |
| `yearPublished` | integer | Year |
| `publishedDate` | string | Publication date |
| `acceptedDate` | string | Acceptance date |
| `depositedDate` | string | Deposit date |
| `documentType` | string | Document type |
| `fullText` | string | Full text |
| `downloadUrl` | string | Download URL |
| `sourceFulltextUrls` | array | Source URLs |
| `citationCount` | integer | Citations |
| `references` | array | References |
| `fieldOfStudy` | array | Fields |
| `identifiers` | array | All identifiers |
| `arxivId` | string | ArXiv ID |
| `magId` | string | Microsoft Academic ID |
| `pubmedId` | string | PubMed ID |
| `oaiIds` | array | OAI-PMH IDs |
| `dataProviders` | array | Providers |
| `outputs` | array | Related outputs |
| `links` | array | Links |
| `createdDate` | string | Creation date |
| `updatedDate` | string | Last update |

### Output - Additional Fields

| Field | Type | Description |
|-------|------|-------------|
| `repositories` | array | Source repositories |
| `repositoryDocument` | object | Repository document |
| `fulltextStatus` | string | Full text status |
| `language` | string | Language |
| `license` | string | License |
| `subjects` | array | Subjects |
| `tags` | array | Tags |
| `sdg` | array | Sustainable Development Goals |
| `oai` | string | OAI identifier |
| `setSpecs` | array | OAI-PMH sets |

### Data Provider - Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | CORE ID |
| `name` | string | Name |
| `institutionName` | string | Institution |
| `type` | string | Type (repository, journal) |
| `homepageUrl` | string | Website URL |
| `oaiPmhUrl` | string | OAI-PMH URL |
| `email` | string | Contact |
| `location` | object | Location |
| `logo` | string | Logo URL |
| `rorId` | string | ROR ID |
| `openDoarId` | string | OpenDOAR ID |
| `software` | string | Software (DSpace, EPrints) |
| `metadataFormat` | string | Metadata format |

---

## Paid Sources

### Scopus

| Entity | Key Fields |
|--------|-------------|
| **Document** | EID, DOI, title, authors, abstract, affiliation, citedby_count, keywords, subject_areas |
| **Author** | Author ID, name, affiliation, h-index, document_count, cited_by_count, orcid |
| **Affiliation** | Affiliation ID, name, city, country, document_count |

### Web of Science

| Entity | Key Fields |
|--------|-------------|
| **Document** | UID, DOI, title, authors, source, year, keywords, times_cited |
| **Journal** | ISSN, title, impact_factor, category, publisher |

### IEEE Xplore

| Entity | Key Fields |
|--------|-------------|
| **Document** | Article number, DOI, title, authors, abstract, publication_title, conference_dates, content_type |
| **Standard** | Standard number, title, status, committee |

### Dimensions

| Entity | Key Fields |
|--------|-------------|
| **Publications** | id, doi, title, authors, abstract, journal, year, citations_count, altmetrics |
| **Grants** | id, title, funder, amount, start_year, investigators |
| **Patents** | id, title, inventors, assignees, filing_date, jurisdiction |
| **Clinical Trials** | id, title, phase, conditions, interventions, registry |
| **Datasets** | id, doi, title, repository, year |
| **Policy Documents** | id, title, publisher, year |

---

## Coverage Comparison

| Source | Publications | Authors | Citations | Full Text | Funding |
|--------|-------------|---------|-----------|----------------|-------------|
| Semantic Scholar | ✅ 200M+ | ✅ | ✅ Rich | ❌ | ❌ |
| PubMed | ✅ 35M+ | ✅ | ❌ | Via PMC | ✅ |
| Europe PMC | ✅ 40M+ | ✅ | ✅ | ✅ 10M+ | ✅ |
| Unpaywall | ❌ | ❌ | ❌ | ✅ URLs | ❌ |
| OpenCitations | ❌ | ❌ | ✅ 1.4B+ | ❌ | ❌ |
| DataCite | ✅ 50M+ | ✅ | ✅ | ❌ | ✅ |
| DOAJ | ✅ 9M+ | ✅ | ❌ | ❌ | ❌ |
| Zenodo | ✅ 3M+ | ✅ | ❌ | ✅ | ✅ |
| DBLP | ✅ 6M+ | ✅ | ❌ | ❌ | ❌ |
| bioRxiv | ✅ 250k+ | ✅ | ❌ | ✅ | ✅ |
| CORE | ✅ 300M+ | ✅ | ✅ | ✅ | ❌ |
