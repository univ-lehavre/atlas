/**
 * Type declarations for vitest-axe matchers
 * Extends Vitest's Assertion interface with accessibility testing matchers
 */

import 'vitest';

declare module 'vitest' {
  interface Assertion {
    /**
     * Assert that the given axe results have no accessibility violations
     */
    toHaveNoViolations(): void;
  }

  interface AsymmetricMatchersContaining {
    /**
     * Assert that the given axe results have no accessibility violations
     */
    toHaveNoViolations(): void;
  }
}
