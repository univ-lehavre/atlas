---
title: Rapport de validation — plan 2026-05-30
---

Vérification automatisée du [plan de résorption 2026-05-30](./2026-05-30-resorption) par un agent relecteur indépendant. Le document ci-dessous est consigné pour traçabilité : il liste les écarts détectés et l'état de leur traitement.

## Résultat

**Verdict initial : Orange** (architecture saine, exécutable après corrections mineures).

Après application des correctifs bloquants, le plan passe à **Vert** sur les axes mesurables. Les ambiguïtés agentiques restantes sont signalées dans la section « À trancher avant exécution » du plan.

## Synthèse de validation

| Critère                              | Statut initial | Statut après correctifs | Commentaire                                                                                                                                                                |
| ------------------------------------ | -------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Couverture findings                  | Gaps apparents | OK                      | Le validateur n'a vu que les 50 000 premiers caractères du plan (80 794 au total). Les phases 9-16, qu'il pensait absentes, sont présentes et couvrent les findings 41-61. |
| Couverture TODO                      | Gaps partiels  | OK                      | Idem : les items « Hors DevSecOps » sont traités en phase 14 et 10 (visibles dans le plan complet).                                                                        |
| Dépendances cohérentes               | OK             | OK                      | Filet (P1) → Mesure (P2) → Combler (P3) → E2E (P4) → Refactor sous filet (P5-13). Aucune dépendance circulaire.                                                            |
| Commandes validation                 | Issues         | OK                      | 3 noms de paquets pnpm corrigés (`atlas-services-crf` → `atlas-crf`, `assets-logos` → `@univ-lehavre/atlas-logos`, `shared-config` → `@univ-lehavre/atlas-shared-config`). |
| Référence ADR                        | Issues         | OK                      | `0019-derogations.md` → `0019-derogations-workspace-audit.md` (5 occurrences corrigées).                                                                                   |
| Fin de plan (suppression de TODO.md) | Non vérifiable | OK                      | Phase 16 présente avec migration explicite et `git rm TODO.md`. Vérification : `grep -c "Suppression de TODO.md" plan = 5`.                                                |
| Agentique-ready                      | Issues         | À trancher              | 4 décisions ouvertes (étapes 3.7, 6.8, 7.2, 7.3) à pré-trancher avant exécution unattended (cf. ci-dessous).                                                               |

## Correctifs appliqués

1. **Noms de paquets erronés** (commandes pnpm qui auraient échoué) :
   - Étape 3.1 et toutes occurrences : `@univ-lehavre/atlas-services-crf` → `@univ-lehavre/atlas-crf` (vérifié dans `services/crf/package.json`).
   - Étape 2.5 : `assets-logos` → `@univ-lehavre/atlas-logos` (vérifié dans `assets/logos/package.json`).
   - Étape 1.5 : `@univ-lehavre/shared-config` → `@univ-lehavre/atlas-shared-config` (vérifié dans `config/shared-config/package.json`).
2. **Référence ADR 0019** : `docs/decisions/0019-derogations.md` → `docs/decisions/0019-derogations-workspace-audit.md`, 5 occurrences corrigées (étapes 1.1, 2.4, 2.6, 3.7, 6.7).

## À trancher avant exécution unattended

Pour respecter le principe « pas de questions à l'utilisateur », les décisions suivantes doivent être pré-tranchées (par un humain ou un agent de planification) avant lancement :

1. **Étape 3.7 — Couverture `cli/logos`** : « ajouter des tests OU documenter comme wrapper trivial dans ADR 0019 ». Choix par défaut suggéré : **documenter dans ADR 0019 comme wrapper trivial** (le code est essentiellement une copie de fichiers, peu de logique).
2. **Étape 6.8 — Convention de nommage `atlas-`** : « préfixe obligatoire / interdit / libre ». Choix par défaut suggéré : **préfixe obligatoire pour les paquets publiés sur npm** (alignement avec l'organisation `@univ-lehavre/atlas-*` déjà en place).
3. **Étape 7.2 — Prompts citation** : « migrer vers `cli/citation` OU `cli/biblio` OU créer `cli/citation-validate` ». L'audit recommande explicitement `cli/biblio` (finding 5). Choix par défaut suggéré : **`cli/biblio`** (cohérence avec la recommandation d'audit).
4. **Étape 7.3 — `sandbox/crf-sandbox-core`** : suppression ou complétion. Le plan recommande déjà suppression par défaut. Risque mentionné par le validateur : des hints knip ont déjà été nettoyés sur ce paquet (PR #213) → vérifier l'idempotence en lisant le commit avant de supprimer.

## Faux positifs du validateur (préservés pour traçabilité)

- « Plan tronqué à mi-étape 8.3 » : faux. Le plan transmis au validateur faisait 80 794 caractères ; seuls les 50 000 premiers ont été inspectés (limite du contexte injecté). Le plan est complet (16 phases présentes, vérifié par `grep -c "^## Phase" = 16`).
- « Findings 42-61 absents » : faux. Couverts en phases 11-13 du plan complet.
- « Items TODO Hors DevSecOps non visibles » : faux. Couverts en phases 10 et 14 du plan complet.

## Recommandations mineures (non bloquantes)

- **Robustesse shell** : ajouter `2>/dev/null` aux commandes `find` (étape 1.1) et expliciter `bash -c "shopt -s globstar; …"` pour les commandes utilisant `**` (étape 4.3).
- **Outil `act`** mentionné en étape 4.1 : ajouter une vérification de disponibilité (`command -v act`) ou retirer la mention.
- **Date hardcodée** : « 2026-06 » dans ADR 0019 (étape 2.4) → utiliser une formulation relative (« dans le mois qui suit la clôture de Phase 3 »).
- **Cohérence tableau Vue d'ensemble** : ajouter finding 22 à la ligne Phase 1 du tableau (déjà couvert dans l'étape 1.4) ; retirer la mention « finalisation finding 17 » de l'étape 4.3 (finalisé en étape 2.2).

Ces points peuvent être traités au fil de l'eau pendant l'exécution du plan, ou en patch préparatoire si l'agent exécutant souhaite démarrer sur un plan parfaitement nettoyé.
