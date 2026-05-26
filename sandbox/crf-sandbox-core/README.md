# crf-sandbox-core

Bibliothèque réutilisable de scripts de bootstrap pour les sandboxes Docker du monorepo atlas. Factorise la logique générique actuellement dupliquée dans [`sandbox/amarre-sandbox/scripts/`](../amarre-sandbox/scripts/), pour qu'elle soit partagée par `amarre-sandbox` et le futur `sillage-sandbox`.

> Statut : scaffold initial. Aucun module exposé pour l'instant — l'extraction depuis amarre-sandbox arrive dans les commits suivants de cette PR.

## Périmètre

Le package va exposer, à terme :

- **Bootstrap BaaS** — provisionnement Appwrite (root account, organisation, projet, clé API). Identité injectée par appelant (orgId, projectName, rootEmail…).
- **Bootstrap CRF** — install REDCap, création d'un projet dédié, import d'un data dictionary paramétré.
- **Seed** — génération de records synthétiques via `@faker-js/faker`. Deux stratégies : `four-state` (héritée d'amarre, 4 scénarios métier) et `generic` (dict-driven, app-agnostic).
- **Pull prod** — opt-in, tire les vrais records depuis un REDCap distant si creds fournis (probe de joignabilité avant pull).
- **Write app env** — écrit un `.env.local` dans une app cible (`apps/amarre/`, `apps/sillage/`…) avec les clés `BAAS_*`, `CRF_*`, `PUBLIC_*` standards.

Chaque fonctionnalité sera disponible sous deux formes :

- **Fonctions importables** depuis `@univ-lehavre/atlas-crf-sandbox-core` (testables, composables côté wrapper)
- **Bins CLI** — `sandbox-bootstrap-baas`, `sandbox-bootstrap-crf`, `sandbox-seed`, `sandbox-pull-prod`, `sandbox-write-app-env` — pour la composition shell dans les `scripts/start.sh` des wrappers

## Conventions

- **Pas de noms de marques tiers** dans les identifiants : `Crf`/`crf` partout (jamais `redcap`/`openalex`/`ecrin` dans noms de fichiers, fonctions, variables, packages). Le contenu des dictionnaires de données reste tel quel.
- **App-agnostic** : aucun défaut hardcodé pointe vers `amarre`. Tous les paramètres identité (orgId, projectTitle, dictionaryPath, target env path) viennent de l'appelant.
- **Idempotent** : tous les scripts sont ré-entrants. Re-lancer un bootstrap doit converger vers le même état sans erreur.

## Coverage

Ce package vit sous `sandbox/`, hors de la règle 100% des `packages/` (cf. `project_monorepo_restructuring`). Tests unitaires ciblés sur les utilitaires (`utils/env.ts` etc.), pas de couverture exhaustive attendue — la sandbox est validée bout-en-bout par les smoke E2E des wrappers.

## Consommateurs

- [`sandbox/amarre-sandbox/`](../amarre-sandbox/) — sera refactoré en wrapper mince une fois l'extraction terminée
- [`sandbox/sillage-sandbox/`](../sillage-sandbox/) — nouveau wrapper, créé après l'extraction

## License

MIT
