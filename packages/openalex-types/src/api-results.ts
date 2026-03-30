import type { OpenAlexID } from "./branded.js";

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
  id: OpenAlexID;
  display_name: string;
  ror: string;
  country_code: string;
  type: string;
  lineage: string[];
}

interface AffiliationAuthorshipResult {
  raw_affiliation_string: string;
  institution_ids: OpenAlexID[];
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

interface WorksResult {
  id: OpenAlexID;
  doi: string | null;
  title: string;
  display_name: string;
  publication_year: number;
  type: string;
  authorships: Authorship[];
}

interface OpenalexResponse<T> {
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
  OpenalexResponse,
  AffiliationsResult,
  WorksResult,
  IInstitution,
  AuthorshipInstitution,
  RateLimitInfo,
};
