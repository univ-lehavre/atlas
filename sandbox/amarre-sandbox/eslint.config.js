import { scripts } from "@univ-lehavre/atlas-shared-config/eslint";

// Sandbox amarre : scripts node de provisioning (bootstrap, seed,
// pull-from-prod) + tests Playwright (level-5 de la pyramide). Le
// preset `scripts` couvre les deux usages.
export default scripts();
