# scripts/audit/lib

Brique partagée des scripts d'audit et de génération de documentation.

| Fichier               | Rôle                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `workspace-index.mjs` | Indexation du workspace pnpm : découverte des paquets, graphe des dépendances internes, détection de cycles. |

`workspace-index.mjs` est l'unique source de vérité « quels paquets existent et
qui dépend de qui ». Il est réutilisé par
[`scripts/audit/workspace-structure.mjs`](../workspace-structure.mjs) (audit de
structure) et par
[`scripts/docs/generate-packages-map.mjs`](../../docs/generate-packages-map.mjs)
(carte des paquets). Il exporte notamment `ROOTS`, `buildWorkspaceIndex`,
`internalDepsOf`, `buildDependencyGraph` et `detectCycles`, couverts par
`scripts/audit/workspace-index.test.mjs`.
