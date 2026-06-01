/**
 * @fileoverview MSW test server for @univ-lehavre/atlas-fetch-one-api-page.
 *
 * Tests are expected to import `server` and register their handlers via
 * `server.use(...)`. Lifecycle hooks (start/reset/close) must be wired
 * explicitly in each test file to keep the impact on vitest config minimal.
 */
import { setupServer } from "msw/node";

import { handlers } from "./handlers.js";

const server = setupServer(...handlers);

export { server };
