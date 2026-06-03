// Données de statistiques du dépôt pour les composants Vue (migration Astro,
// ADR 0036). Remplace le loader VitePress `repo-stats.data.ts` : on importe le
// JSON généré par `pnpm stats:generate`. Le fichier est régénéré au build (il
// est gitignoré, comme côté VitePress — donnée volatile, classe C de l'ADR 0032).
import type { RepoStats } from "./repo-stats-types";
import json from "./repo-stats.json";

export const data = json as unknown as RepoStats;
