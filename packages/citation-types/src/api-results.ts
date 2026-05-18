import type { CitationID } from "./branded.js";

interface IInstitution {
  id: string;
  ror: string;
  display_name: string;
  country_code: string;
  type: string;
  lineage: string[];
}

interface AffiliationsResult {
  institution: IInstitution;
  years: number[];
}

interface AuthorsResult {
  id: string;
  orcid: string;
  display_name: string;
  display_name_alternatives: string[];
  affiliations: AffiliationsResult[];
  works_api_url: string;
  updated_date: string;
  created_date: string;
}

interface AuthorshipInstitution {
  id: CitationID;
  display_name: string;
  ror: string;
  country_code: string;
  type: string;
  lineage: string[];
}

interface AffiliationAuthorshipResult {
  raw_affiliation_string: string;
  institution_ids: CitationID[];
}

interface Authorship {
  author_position: string;
  author: {
    id: string;
    display_name: string | null;
    orcid: string;
  };
  institutions: AuthorshipInstitution[];
  raw_author_name: string;
  raw_affiliation_strings: string[];
  affiliations: AffiliationAuthorshipResult[];
}

interface TopicHierarchyEntry {
  id: string;
  display_name: string;
}

interface TopicEntry {
  id: string;
  display_name: string;
  score: number;
  subfield: TopicHierarchyEntry;
  field: TopicHierarchyEntry;
  domain: TopicHierarchyEntry;
}

interface KeywordEntry {
  id: string;
  display_name: string;
  score: number;
}

interface WorksResult {
  id: CitationID;
  doi: string | null;
  title: string;
  display_name: string;
  publication_year: number;
  type: string;
  authorships: Authorship[];
  topics?: TopicEntry[];
  keywords?: KeywordEntry[];
}

interface CitationResponse<T> {
  meta: {
    count: number;
    page: number;
    per_page: number;
  };
  results: T[];
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  creditsUsed: number;
  resetInSeconds: number;
}

export type {
  AuthorsResult,
  CitationResponse,
  AffiliationsResult,
  WorksResult,
  TopicEntry,
  KeywordEntry,
  TopicHierarchyEntry,
  IInstitution,
  AuthorshipInstitution,
  RateLimitInfo,
};
