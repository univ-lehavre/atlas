# @univ-lehavre/atlas-cache

## 0.1.0

### Minor Changes

- [#536](https://github.com/univ-lehavre/atlas/pull/536) [`2cbb5f0`](https://github.com/univ-lehavre/atlas/commit/2cbb5f02195c408f15d79a13db888e304c6ba54c) Thanks [@chasset](https://github.com/chasset)! - - fix: écriture atomique via descripteur exclusif (lève l'alerte codeql)
  - fix: aligner le specifier prettier sur ^3.9.3 (cohérence dépôt)
  - fix: écriture atomique sûre (nom tmp aléatoire + flag wx)
  - feat: refreshcoordinator adossé postgres (bridage multi-instance)
  - feat: brancher atlas-stats et crf-logs sur le package de cache
  - feat: package partagé du cache de flux (effect, fichier + postgres)
