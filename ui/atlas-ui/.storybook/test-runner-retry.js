// Réessaie chaque story jusqu'à 2 fois (#296). Le dev server Vite transforme les
// modules de story à la demande ; sous la course des workers du test-runner, la
// première transformation peut perdre la course (« Failed to fetch dynamically
// imported module ») — un retry laisse Vite servir le module déjà compilé. Ne
// masque pas une vraie violation a11y : celle-ci échoue de façon déterministe à
// chaque tentative.
import { jest } from "@jest/globals";

jest.retryTimes(2, { logErrorsBeforeRetry: true });
