// Config Jest du Storybook test-runner (#296). On part des défauts du
// test-runner et on ajoute un filet anti-flakiness : `jest.retryTimes(2)` (via
// le setup ci-dessous) réessaie une story qui échoue à se transformer à temps
// (« Failed to fetch dynamically imported module ») sous la course des workers
// du dev server Vite — ceinture-bretelles avec le warm-up de l'orchestrateur.
import { fileURLToPath } from "node:url";
import { getJestConfig } from "@storybook/test-runner";

const baseConfig = getJestConfig();

// Chemin absolu du setup de retry : `<rootDir>` du test-runner ne pointe pas sur
// ce paquet (getProjectRoot remonte au monorepo), donc on résout depuis ce
// fichier pour rester robuste quel que soit le rootDir.
const retrySetup = fileURLToPath(
  new URL("./test-runner-retry.js", import.meta.url),
);

export default {
  ...baseConfig,
  setupFilesAfterEnv: [...(baseConfig.setupFilesAfterEnv ?? []), retrySetup],
};
