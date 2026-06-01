// Global setup for atlas-ui's Vitest project. Runs before every test
// file in tests/.
//
// - Extends Vitest's `expect` with @testing-library/jest-dom matchers
//   (`toBeInTheDocument`, `toHaveAttribute`, …) and vitest-axe's
//   `toHaveNoViolations` (used by `*.a11y.test.ts`).
// - Cleans the DOM between tests so component instances from one test
//   don't leak into the next.
import "@testing-library/jest-dom/vitest";
import * as axeMatchers from "vitest-axe/matchers";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/svelte";

expect.extend(axeMatchers);

afterEach(() => {
  cleanup();
});
