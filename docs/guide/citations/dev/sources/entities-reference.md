# Référence des entités et champs par source

Ce document détaille les objets récupérables et leurs attributs pour chaque source bibliographique.

## Sommaire

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
- [Sources payantes](#sources-payantes)

---

## Semantic Scholar

**Base URL:** `https://api.semanticscholar.org/graph/v1`

### Entités disponibles

| Entité | Endpoints | Description |
|--------|-----------|-------------|
| **Paper** | `/paper/{id}`, `/paper/search`, `/paper/batch` | Publications scientifiques |
| **Author** | `/author/{id}`, `/author/search`, `/author/batch` | Profils d'auteurs |
| **Citation** | `/paper/{id}/citations` | Citations entrantes |
| **Reference** | `/paper/{id}/references` | Références sortantes |
| **Snippet** | `/snippet/search` | Extraits de texte |

### Paper - Champs disponibles

| Champ | Type | Description | Toujours retourné |
|-------|------|-------------|-------------------|
| `paperId` | string | Identifiant SHA unique | ✅ |
| `title` | string | Titre de l'article | ✅ |
| `corpusId` | integer | Identifiant numérique secondaire | ❌ |
| `externalIds` | object | DOI, ArXiv, MAG, ACL, PMID, PMCID, DBLP | ❌ |
| `url` | string | URL page Semantic Scholar | ❌ |
| `abstract` | string | Résumé | ❌ |
| `venue` | string | Nom du lieu de publication | ❌ |
| `publicationVenue` | object | Détails venue (id, name, type, URLs) | ❌ |
| `year` | integer | Année de publication | ❌ |
| `publicationDate` | string | Date complète (YYYY-MM-DD) | ❌ |
| `publicationTypes` | array | Classification (Review, JournalArticle, Conference) | ❌ |
| `referenceCount` | integer | Nombre de références | ❌ |
| `citationCount` | integer | Nombre de citations | ❌ |
| `influentialCitationCount` | integer | Citations à fort impact | ❌ |
| `isOpenAccess` | boolean | Statut Open Access | ❌ |
| `openAccessPdf` | object | URL PDF, status, licence | ❌ |
| `fieldsOfStudy` | array | Catégories académiques | ❌ |
| `s2FieldsOfStudy` | array | Classifications détaillées avec sources | ❌ |
| `journal` | object | Nom, volume, pages | ❌ |
| `citationStyles` | object | Format BibTeX | ❌ |
| `authors` | array | Liste des auteurs | ❌ |
| `citations` | array | Articles citants | ❌ |
| `references` | array | Articles cités | ❌ |
| `embedding` | object | Vecteur SPECTER (v1 ou v2) | ❌ |
| `tldr` | object | Résumé généré par IA | ❌ |

### Author - Champs disponibles

| Champ | Type | Description | Toujours retourné |
|-------|------|-------------|-------------------|
| `authorId` | string | Identifiant unique | ✅ |
| `name` | string | Nom complet | ✅ |
| `externalIds` | object | ORCID, DBLP | ❌ |
| `url` | string | URL profil S2 | ❌ |
| `affiliations` | array | Organisations | ❌ |
| `homepage` | string | Site personnel | ❌ |
| `paperCount` | integer | Nombre de publications | ❌ |
| `citationCount` | integer | Total citations | ❌ |
| `hIndex` | integer | h-index | ❌ |
| `papers` | array | Publications | ❌ |

### Identifiants supportés

```
paperId (SHA), CorpusId:<id>, DOI:<doi>, ARXIV:<id>, MAG:<id>,
ACL:<id>, PMID:<id>, PMCID:<id>, URL:<url>
```

---

## PubMed / NCBI

**Base URL:** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`

### Endpoints E-utilities

| Endpoint | Fonction | Output |
|----------|----------|--------|
| `einfo.fcgi` | Métadonnées des bases | Liste bases, champs indexés |
| `esearch.fcgi` | Recherche | UIDs, count, query_key |
| `efetch.fcgi` | Récupération | Records complets |
| `esummary.fcgi` | Résumés | DocSums (métadonnées légères) |
| `elink.fcgi` | Liens | UIDs liés, liens externes |
| `epost.fcgi` | Upload UIDs | Session History |
| `espell.fcgi` | Correction orthographe | Suggestions |
| `ecitmatch.cgi` | Match citations | PMIDs |

### Bases de données principales

| Base | Contenu | Records |
|------|---------|---------|
| `pubmed` | Littérature biomédicale | 35M+ |
| `pmc` | Texte intégral Open Access | 8M+ |
| `gene` | Gènes | - |
| `protein` | Protéines | - |
| `nucleotide` | Séquences ADN/ARN | - |
| `taxonomy` | Taxonomie | - |
| `clinvar` | Variants cliniques | - |

### PubMed Article - Champs disponibles

| Champ | Description | Via |
|-------|-------------|-----|
| `PMID` | Identifiant PubMed | efetch |
| `Title` | Titre | efetch, esummary |
| `Abstract` | Résumé | efetch |
| `AuthorList` | Auteurs (nom, affiliation, ORCID) | efetch |
| `Journal` | Titre journal, ISSN, volume, issue | efetch |
| `PubDate` | Date publication | efetch |
| `ArticleType` | Type (Review, Research, etc.) | efetch |
| `MeshHeadingList` | Termes MeSH | efetch |
| `KeywordList` | Mots-clés auteurs | efetch |
| `GrantList` | Financements | efetch |
| `ReferenceList` | Références citées | efetch |
| `DOI` | Digital Object Identifier | efetch |
| `PMC` | ID PubMed Central | elink |

### Formats de sortie

| Format | Paramètre | Description |
|--------|-----------|-------------|
| XML PubMed | `rettype=xml` | Format natif complet |
| MEDLINE | `rettype=medline` | Format bibliographique |
| Abstract | `rettype=abstract` | Texte brut |
| JSON | `retmode=json` | Pour esearch, esummary |

---

## Europe PMC

**Base URL:** `https://www.ebi.ac.uk/europepmc/webservices/rest/`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/search` | Recherche publications |
| `/fields` | Champs de recherche disponibles |
| `/{source}/{id}/citations` | Citations entrantes |
| `/{source}/{id}/references` | Références |
| `/{source}/{id}/databaseLinks` | Liens bases de données |
| `/{source}/{id}/textMinedTerms` | Annotations text-mining |
| `/{id}/fullTextXML` | Texte intégral XML |
| `/{id}/supplementaryFiles` | Fichiers supplémentaires |

### Article - Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant (PMID ou PMC) |
| `source` | string | MED, PMC, PAT, etc. |
| `title` | string | Titre |
| `authorString` | string | Auteurs formatés |
| `authorList` | array | Auteurs détaillés |
| `journalTitle` | string | Titre journal |
| `pubYear` | integer | Année |
| `abstractText` | string | Résumé |
| `doi` | string | DOI |
| `isOpenAccess` | boolean | Statut OA |
| `inEPMC` | boolean | Texte intégral dans EPMC |
| `citedByCount` | integer | Nombre citations |
| `hasReferences` | boolean | Références disponibles |
| `grantsList` | array | Financements |
| `meshHeadingList` | array | Termes MeSH |
| `chemicalList` | array | Substances chimiques |

### Annotations text-mining

| Type | Description |
|------|-------------|
| `DISEASE` | Maladies |
| `GENE_PROTEIN` | Gènes/Protéines |
| `ORGANISM` | Organismes |
| `CHEMICAL` | Composés chimiques |
| `GO_TERM` | Gene Ontology |

---

## Unpaywall

**Base URL:** `https://api.unpaywall.org/v2/`

### Endpoint unique

```
GET /{doi}?email=your@email.com
```

### Work - Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `doi` | string | DOI |
| `doi_url` | string | URL DOI résolue |
| `title` | string | Titre |
| `genre` | string | Type (journal-article, book-chapter, etc.) |
| `is_paratext` | boolean | Contenu éditorial |
| `published_date` | string | Date publication |
| `year` | integer | Année |
| `journal_name` | string | Nom journal |
| `journal_issns` | string | ISSNs |
| `journal_issn_l` | string | ISSN-L |
| `publisher` | string | Éditeur |
| `is_oa` | boolean | **Open Access ?** |
| `oa_status` | string | **gold, green, hybrid, bronze, closed** |
| `has_repository_copy` | boolean | Copie en dépôt |
| `best_oa_location` | object | **Meilleure localisation OA** |
| `first_oa_location` | object | Première localisation OA |
| `oa_locations` | array | **Toutes les localisations OA** |
| `oa_locations_embargoed` | array | Localisations sous embargo |
| `updated` | string | Dernière mise à jour |
| `data_standard` | integer | Version données |
| `z_authors` | array | Auteurs (via Crossref) |

### OA Location - Sous-objet

| Champ | Type | Description |
|-------|------|-------------|
| `url` | string | URL page |
| `url_for_pdf` | string | URL directe PDF |
| `url_for_landing_page` | string | Page d'accueil |
| `host_type` | string | publisher, repository |
| `license` | string | CC-BY, CC-BY-NC, etc. |
| `version` | string | publishedVersion, acceptedVersion, submittedVersion |
| `evidence` | string | Source de la détection |
| `pmh_id` | string | ID OAI-PMH |
| `endpoint_id` | string | ID du endpoint |
| `repository_institution` | string | Institution du dépôt |

---

## OpenCitations

**Base URL:** `https://api.opencitations.net/index/v2`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/citation/{oci}` | Citation par OCI |
| `/citations/{id}` | Citations entrantes |
| `/references/{id}` | Références sortantes |
| `/citation-count/{id}` | Comptage citations |
| `/reference-count/{id}` | Comptage références |

### Citation - Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `oci` | string | Open Citation Identifier |
| `citing` | string | IDs de l'article citant |
| `cited` | string | IDs de l'article cité |
| `creation` | string | Date création (ISO 8601) |
| `timespan` | string | Durée entre publication (PnYnMnD) |
| `journal_sc` | string | Auto-citation journal (yes/no) |
| `author_sc` | string | Auto-citation auteur (yes/no) |

### Identifiants supportés

```
DOI, PMID, PMCID, OMID (OpenCitations ID), ISSN (pour venues)
```

---

## DataCite

**Base URL:** `https://api.datacite.org/`

### Endpoints principaux

| Endpoint | Description |
|----------|-------------|
| `/dois` | Recherche DOIs |
| `/dois/{doi}` | DOI spécifique |
| `/clients` | Organisations membres |
| `/providers` | Fournisseurs |

### DOI Record - Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `doi` | string | DOI |
| `prefix` | string | Préfixe DOI |
| `suffix` | string | Suffixe |
| `identifiers` | array | Identifiants alternatifs |
| `creators` | array | Créateurs (nom, affiliation, ORCID, ROR) |
| `titles` | array | Titres (principal, alternatif) |
| `publisher` | string | Éditeur |
| `publicationYear` | integer | Année |
| `resourceType` | object | Type (Dataset, Software, etc.) |
| `subjects` | array | Sujets |
| `contributors` | array | Contributeurs |
| `dates` | array | Dates (created, issued, updated) |
| `language` | string | Langue (ISO 639) |
| `types` | object | Types de ressource |
| `relatedIdentifiers` | array | Liens vers autres ressources |
| `sizes` | array | Tailles |
| `formats` | array | Formats de fichier |
| `version` | string | Version |
| `rights` | array | Licences |
| `descriptions` | array | Descriptions |
| `geoLocations` | array | Localisations géographiques |
| `fundingReferences` | array | Financements |
| `url` | string | Landing page |
| `contentUrl` | string | URL contenu |
| `xml` | string | Métadonnées XML (Base64) |
| `viewCount` | integer | Nombre de vues |
| `downloadCount` | integer | Téléchargements |
| `citationCount` | integer | Citations |
| `state` | string | findable, registered, draft |
| `created` | string | Date création |
| `registered` | string | Date enregistrement |
| `updated` | string | Dernière mise à jour |

---

## DOAJ

**Base URL:** `https://doaj.org/api/`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/search/articles/{query}` | Recherche articles |
| `/search/journals/{query}` | Recherche revues |
| `/articles/{id}` | Article par ID |
| `/journals/{issn}` | Revue par ISSN |
| `/bulk/articles` | Upload batch articles |

### Article (bibjson) - Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | ID DOAJ |
| `bibjson.title` | string | Titre |
| `bibjson.identifier` | array | DOI, autres IDs |
| `bibjson.journal.title` | string | Titre revue |
| `bibjson.journal.issns` | array | ISSNs |
| `bibjson.journal.publisher` | string | Éditeur |
| `bibjson.journal.country` | string | Pays |
| `bibjson.author` | array | Auteurs |
| `bibjson.abstract` | string | Résumé |
| `bibjson.keywords` | array | Mots-clés |
| `bibjson.year` | string | Année |
| `bibjson.month` | string | Mois |
| `bibjson.start_page` | string | Page début |
| `bibjson.end_page` | string | Page fin |
| `bibjson.link` | array | Liens (PDF, HTML, ePUB, XML) |
| `bibjson.subject` | array | Sujets |
| `created_date` | string | Date création |
| `last_updated` | string | Dernière mise à jour |

### Journal (bibjson) - Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | ID DOAJ |
| `bibjson.title` | string | Titre |
| `bibjson.alternative_title` | string | Titre alternatif |
| `bibjson.identifier` | array | pISSN, eISSN |
| `bibjson.publisher` | object | Éditeur, pays |
| `bibjson.institution` | object | Institution |
| `bibjson.oa_start` | integer | Année début OA |
| `bibjson.apc` | object | Frais de publication |
| `bibjson.license` | array | Licences |
| `bibjson.subject` | array | Sujets |
| `bibjson.language` | array | Langues |
| `bibjson.ref.aims_scope` | string | URL objectifs |
| `bibjson.ref.author_instructions` | string | URL instructions auteurs |

---

## Zenodo

**Base URL:** `https://zenodo.org/api/`

### Endpoints principaux

| Endpoint | Description |
|----------|-------------|
| `/records` | Recherche records publiés |
| `/records/{id}` | Record spécifique |
| `/deposit/depositions` | Gestion dépôts |
| `/licenses` | Licences disponibles |
| `/communities` | Communautés |

### Record - Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `id` | integer | ID Zenodo |
| `doi` | string | DOI |
| `doi_url` | string | URL DOI |
| `conceptdoi` | string | DOI du concept (toutes versions) |
| `conceptrecid` | integer | ID concept |
| `created` | string | Date création |
| `modified` | string | Dernière modification |
| `metadata.title` | string | Titre |
| `metadata.description` | string | Description (HTML) |
| `metadata.upload_type` | string | publication, dataset, software, etc. |
| `metadata.publication_type` | string | article, preprint, thesis, etc. |
| `metadata.publication_date` | string | Date publication |
| `metadata.creators` | array | Créateurs (name, affiliation, orcid, gnd) |
| `metadata.contributors` | array | Contributeurs |
| `metadata.keywords` | array | Mots-clés |
| `metadata.subjects` | array | Sujets contrôlés |
| `metadata.related_identifiers` | array | Identifiants liés |
| `metadata.grants` | array | Financements |
| `metadata.communities` | array | Communautés |
| `metadata.license` | object | Licence |
| `metadata.access_right` | string | open, embargoed, restricted, closed |
| `metadata.embargo_date` | string | Date fin embargo |
| `metadata.journal.title` | string | Journal (si article) |
| `metadata.journal.volume` | string | Volume |
| `metadata.journal.issue` | string | Numéro |
| `metadata.journal.pages` | string | Pages |
| `metadata.conference.title` | string | Conférence |
| `metadata.conference.dates` | string | Dates conférence |
| `metadata.conference.place` | string | Lieu |
| `metadata.conference.url` | string | URL conférence |
| `metadata.imprint.publisher` | string | Éditeur |
| `metadata.imprint.isbn` | string | ISBN |
| `metadata.thesis.university` | string | Université |
| `metadata.thesis.supervisors` | array | Directeurs |
| `metadata.version` | string | Version |
| `metadata.language` | string | Langue (ISO 639-3) |
| `metadata.locations` | array | Localisations géo |
| `metadata.dates` | array | Dates additionnelles |
| `metadata.method` | string | Méthodologie |
| `files` | array | Fichiers (id, filename, size, checksum) |
| `owners` | array | Propriétaires |
| `stats` | object | Statistiques (views, downloads) |

---

## DBLP

**Base URL:** `https://dblp.org/`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/search/publ/api` | Recherche publications |
| `/search/author/api` | Recherche auteurs |
| `/search/venue/api` | Recherche venues |
| `/pid/{pid}.xml` | Publication par ID |
| `/rec/{key}.xml` | Record par clé |

### Publication - Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `key` | string | Clé DBLP unique |
| `title` | string | Titre |
| `authors` | array | Auteurs |
| `venue` | string | Conference/Journal |
| `year` | integer | Année |
| `type` | string | article, inproceedings, book, etc. |
| `doi` | string | DOI |
| `ee` | string | URL électronique |
| `url` | string | URL DBLP |
| `pages` | string | Pages |
| `volume` | string | Volume |
| `number` | string | Numéro |

### Author - Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `pid` | string | Person ID |
| `name` | string | Nom |
| `aliases` | array | Noms alternatifs |
| `url` | string | URL profil |
| `affiliations` | array | Affiliations |
| `notes` | array | Notes |

### Venue - Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `venue` | string | Nom complet |
| `acronym` | string | Acronyme |
| `type` | string | journal, conference, workshop |
| `url` | string | URL DBLP |

---

## bioRxiv / medRxiv

**Base URL:** `https://api.biorxiv.org/`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/details/{server}/{interval}` | Métadonnées par période |
| `/pubs/{server}/{interval}` | Preprints publiés |
| `/pub/{interval}` | Publications (bioRxiv) |
| `/publisher/{prefix}/{interval}` | Par éditeur |
| `/funder/{server}/{interval}/{ror}` | Par financeur |
| `/sum/{interval}` | Statistiques |
| `/usage/{interval}/{server}` | Métriques d'usage |

### Preprint - Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `doi` | string | DOI du preprint |
| `title` | string | Titre |
| `authors` | string | Auteurs (format texte) |
| `author_corresponding` | string | Auteur correspondant |
| `author_corresponding_institution` | string | Institution correspondant |
| `date` | string | Date publication |
| `version` | string | Version (1, 2, etc.) |
| `type` | string | Type de preprint |
| `license` | string | Licence |
| `category` | string | Catégorie scientifique |
| `jatsxml` | string | URL XML JATS |
| `abstract` | string | Résumé |
| `published` | string | DOI version publiée |
| `server` | string | biorxiv ou medrxiv |

### Published Preprint - Champs supplémentaires

| Champ | Type | Description |
|-------|------|-------------|
| `biorxiv_doi` | string | DOI preprint |
| `published_doi` | string | DOI publié |
| `published_journal` | string | Journal publication |
| `published_date` | string | Date publication |
| `preprint_platform` | string | Plateforme origine |

### Funder Data - Champs supplémentaires

| Champ | Type | Description |
|-------|------|-------------|
| `funding.name` | string | Nom financeur |
| `funding.id` | string | ID financeur |
| `funding.id-type` | string | Type ID (ROR, Crossref) |
| `funding.award` | string | Numéro grant |

### Usage Statistics

| Champ | Type | Description |
|-------|------|-------------|
| `month` | string | Mois |
| `abstract_views` | integer | Vues résumé |
| `full_text_views` | integer | Vues texte |
| `pdf_downloads` | integer | Téléchargements PDF |
| `*_cumulative` | integer | Totaux cumulés |

---

## CORE

**Base URL:** `https://api.core.ac.uk/v3/`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `/search/works` | Recherche works (dédupliqués) |
| `/search/outputs` | Recherche outputs (bruts) |
| `/search/data-providers` | Recherche fournisseurs |
| `/search/journals` | Recherche journaux |
| `/works/{id}` | Work spécifique |
| `/outputs/{id}` | Output spécifique |
| `/outputs/{id}/download` | Téléchargement PDF |

### Work - Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `id` | integer | ID CORE |
| `doi` | string | DOI |
| `title` | string | Titre |
| `abstract` | string | Résumé |
| `authors` | array | Auteurs |
| `contributors` | array | Contributeurs |
| `publisher` | string | Éditeur |
| `journals` | array | Journaux |
| `yearPublished` | integer | Année |
| `publishedDate` | string | Date publication |
| `acceptedDate` | string | Date acceptation |
| `depositedDate` | string | Date dépôt |
| `documentType` | string | Type document |
| `fullText` | string | Texte intégral |
| `downloadUrl` | string | URL téléchargement |
| `sourceFulltextUrls` | array | URLs sources |
| `citationCount` | integer | Citations |
| `references` | array | Références |
| `fieldOfStudy` | array | Domaines |
| `identifiers` | array | Tous identifiants |
| `arxivId` | string | ID ArXiv |
| `magId` | string | ID Microsoft Academic |
| `pubmedId` | string | ID PubMed |
| `oaiIds` | array | IDs OAI-PMH |
| `dataProviders` | array | Fournisseurs |
| `outputs` | array | Outputs liés |
| `links` | array | Liens |
| `createdDate` | string | Date création |
| `updatedDate` | string | Dernière mise à jour |

### Output - Champs supplémentaires

| Champ | Type | Description |
|-------|------|-------------|
| `repositories` | array | Dépôts source |
| `repositoryDocument` | object | Document dans dépôt |
| `fulltextStatus` | string | Statut texte intégral |
| `language` | string | Langue |
| `license` | string | Licence |
| `subjects` | array | Sujets |
| `tags` | array | Tags |
| `sdg` | array | Objectifs Développement Durable |
| `oai` | string | Identifiant OAI |
| `setSpecs` | array | Sets OAI-PMH |

### Data Provider - Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `id` | integer | ID CORE |
| `name` | string | Nom |
| `institutionName` | string | Institution |
| `type` | string | Type (repository, journal) |
| `homepageUrl` | string | URL site |
| `oaiPmhUrl` | string | URL OAI-PMH |
| `email` | string | Contact |
| `location` | object | Localisation |
| `logo` | string | URL logo |
| `rorId` | string | ID ROR |
| `openDoarId` | string | ID OpenDOAR |
| `software` | string | Logiciel (DSpace, EPrints) |
| `metadataFormat` | string | Format métadonnées |

---

## Sources payantes

### Scopus

| Entité | Champs clés |
|--------|-------------|
| **Document** | EID, DOI, title, authors, abstract, affiliation, citedby_count, keywords, subject_areas |
| **Author** | Author ID, name, affiliation, h-index, document_count, cited_by_count, orcid |
| **Affiliation** | Affiliation ID, name, city, country, document_count |

### Web of Science

| Entité | Champs clés |
|--------|-------------|
| **Document** | UID, DOI, title, authors, source, year, keywords, times_cited |
| **Journal** | ISSN, title, impact_factor, category, publisher |

### IEEE Xplore

| Entité | Champs clés |
|--------|-------------|
| **Document** | Article number, DOI, title, authors, abstract, publication_title, conference_dates, content_type |
| **Standard** | Standard number, title, status, committee |

### Dimensions

| Entité | Champs clés |
|--------|-------------|
| **Publications** | id, doi, title, authors, abstract, journal, year, citations_count, altmetrics |
| **Grants** | id, title, funder, amount, start_year, investigators |
| **Patents** | id, title, inventors, assignees, filing_date, jurisdiction |
| **Clinical Trials** | id, title, phase, conditions, interventions, registry |
| **Datasets** | id, doi, title, repository, year |
| **Policy Documents** | id, title, publisher, year |

---

## Comparaison des couvertures

| Source | Publications | Auteurs | Citations | Texte intégral | Financement |
|--------|-------------|---------|-----------|----------------|-------------|
| Semantic Scholar | ✅ 200M+ | ✅ | ✅ Riche | ❌ | ❌ |
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
