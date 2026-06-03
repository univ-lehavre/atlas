---
title: "0010 — `node-appwrite` SDK 25.x conservé pour `TablesDB`"
---

## Contexte

Le serveur Appwrite déployé est en version 1.9.0. Le SDK officiel
`node-appwrite` recommande, à chaque montée de version serveur, de
synchroniser le SDK pour conserver les bons types et endpoints.

Le SDK 24.x était la version « strictement compatible » avec le serveur
1.9.0. Le SDK 25.x est sorti pour cibler une version serveur ultérieure
(1.9.5+) et **introduit l'API `TablesDB`**, qui est consommée par
[`apps/ecrin`](https://github.com/univ-lehavre/atlas/tree/main/apps/ecrin) pour ses listings tabulaires.

Downgrade vers 24.x = perte de `TablesDB`. Garder 25.x = un warning au
runtime sur le mismatch de version serveur, sans impact fonctionnel
observé.

## Décision

Le monorepo conserve `node-appwrite` SDK **25.x** malgré le serveur en
1.9.0. Le warning est toléré tant qu'aucune régression n'est observée
sur les endpoints utilisés. La situation est réévaluée si Appwrite
tarde plus de 6 mois sur la sortie de 1.9.5 ou si une régression apparaît.

## Statut

Accepted (2026-05-22).

## Conséquences

**Bénéfices.** `apps/ecrin` peut continuer à utiliser `TablesDB` sans
réécriture vers l'API legacy. Le monorepo reste sur une trajectoire
SDK moderne, prêt pour le serveur 1.9.5 dès qu'il sera déployé.

**Prix à payer.** Un warning « version mismatch » au démarrage. Risque
résiduel qu'un endpoint changé entre 24.x et 25.x se comporte
silencieusement mal côté serveur 1.9.0 — atténué par les tests
d'intégration et la couverture E2E.

**Garde-fous.**

- Vérifier mensuellement la disponibilité d'Appwrite serveur 1.9.5+
  (release notes, GitHub releases).
- Si un endpoint régresse, downgrader immédiatement vers 24.x et
  réintégrer `TablesDB` via le package interne
  `@univ-lehavre/atlas-baas`.
- Le pinning précis du SDK est documenté dans les `package.json` des
  apps consommatrices.
