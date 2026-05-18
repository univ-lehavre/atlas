import type { RateLimiter } from "effect";
import type {
  CitationResponse,
  WorksResult,
  AuthorsSearchResult,
} from "./citation.js";

type QueryValue =
  | string
  | number
  | boolean
  | Array<string | number | boolean>
  | undefined;

type Query = Record<string, QueryValue>;

interface Env {
  user_agent: string;
  rate_limit: RateLimiter.RateLimiter.Options;
  per_page: number;
  citation_api_url: string;
  citation_api_key?: string;
}
interface Args {
  name?: string;
}

export type {
  AuthorsSearchResult,
  WorksResult,
  CitationResponse,
  QueryValue,
  Query,
  Args,
  Env,
};
