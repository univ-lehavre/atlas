import type { RateLimiter } from "effect";
import type {
  OpenalexResponse,
  WorksResult,
  AuthorsSearchResult,
} from "./openalex.js";

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
  openalex_api_url: string;
}
interface Args {
  name?: string;
}

export type {
  AuthorsSearchResult,
  WorksResult,
  OpenalexResponse,
  QueryValue,
  Query,
  Args,
  Env,
};
