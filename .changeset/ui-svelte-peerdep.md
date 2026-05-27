---
"@univ-lehavre/atlas-ui": patch
---

Déclare `svelte` en `peerDependencies` (`^5.0.0`) au lieu de seulement `devDependencies`. Conforme à la règle `ui/` du dépôt — l'application hôte fournit sa version de Svelte plutôt que de la dupliquer.
