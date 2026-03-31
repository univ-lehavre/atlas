/**
 * Accessibility testing utilities using axe-core via vitest-axe
 * @module test-utils/axe
 */

import * as matchers from 'vitest-axe/matchers';
import { expect } from 'vitest';

// Extend Vitest matchers with axe accessibility matchers
expect.extend(matchers);

export { axe } from 'vitest-axe';
