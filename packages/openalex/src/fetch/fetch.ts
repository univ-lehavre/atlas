import { Effect } from "effect";
import qs from "qs";

import { FetchError, StatusError } from "../errors.js";
import type { Query } from "../types/index.js";

const build_url = (base_url: URL, params: Query): URL => {
  const search_params = qs.stringify(params);
  const url_string = `${base_url.toString()}?${search_params}`;
  const url = new URL(url_string);
  return url;
};

const build_headers = (user_agent: string): Headers => {
  const headers = new Headers();
  headers.append("User-Agent", user_agent);
  return headers;
};

const fetch_one_page = <T>(
  base_url: URL,
  params: Query,
  user_agent: string,
): Effect.Effect<T, StatusError | FetchError, never> =>
  Effect.tryPromise({
    try: async () => {
      const url = build_url(base_url, params);
      const headers = build_headers(user_agent);
      const res = await fetch(url, {
        method: "GET",
        headers,
      });
      if (!res.ok)
        throw new StatusError(`Le serveur a retourné un statut inattendu`, {
          cause: `HTTP ${res.status}: ${res.statusText}`,
        });
      const json = (await res.json()) as T;
      return json;
    },
    catch: (cause: unknown) =>
      new FetchError(`La fonction fetch a retourné une erreur`, { cause }),
  });

export { fetch_one_page };
