/**
 * @fileoverview Default MSW handlers for @univ-lehavre/atlas-fetch-one-api-page tests.
 *
 * These are placeholders meant to be overridden per test via `server.use(...)`.
 * Any unhandled request will raise an error (see `server.ts` `onUnhandledRequest`),
 * so individual tests must declare the handlers they need.
 */
import { http, HttpResponse } from "msw";

const handlers = [
  http.get("https://api.example.com/test", () =>
    HttpResponse.json({ ok: true }),
  ),
];

export { handlers };
