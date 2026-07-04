---
"@univ-lehavre/atlas-cache": minor
---

- fix: écriture atomique via descripteur exclusif (lève l'alerte codeql)
- fix: aligner le specifier prettier sur ^3.9.3 (cohérence dépôt)
- fix: écriture atomique sûre (nom tmp aléatoire + flag wx)
- feat: refreshcoordinator adossé postgres (bridage multi-instance)
- feat: brancher atlas-stats et crf-logs sur le package de cache
- feat: package partagé du cache de flux (effect, fichier + postgres)
