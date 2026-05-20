// Global setup for the `ui` Vitest project. Runs before every test file
// in tests/ui/.
//
// - Extends Vitest's `expect` with @testing-library/jest-dom matchers
//   (`toBeInTheDocument`, `toHaveAttribute`, etc.).
// - Cleans the DOM between tests so component instances from one test
//   don't leak into the next.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';

afterEach(() => {
  cleanup();
});
