/**
 * Accessibility testing utilities using axe-core via vitest-axe
 * @module test-utils/axe
 */

import * as matchers from 'vitest-axe/matchers';
import { expect } from 'vitest';

// Extend Vitest matchers with axe accessibility matchers
expect.extend(matchers);

export { axe } from 'vitest-axe';

// Cible WCAG 2.x AA partagée (ADR 0038), via @univ-lehavre/atlas-shared-config.
// Même contrat d'accessibilité que ui/atlas-ui.
export { wcagAxeOptions } from '@univ-lehavre/atlas-shared-config/a11y';
