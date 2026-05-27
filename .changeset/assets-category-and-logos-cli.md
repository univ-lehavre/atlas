---
"@univ-lehavre/atlas-logos": major
"@univ-lehavre/atlas-logos-cli": major
---

Création de la catégorie `assets/` et extraction du CLI d'installation des logos.

- `@univ-lehavre/atlas-logos` (auparavant `packages/logos`) est désormais dans `assets/logos/`. Le paquet **ne contient plus que des fichiers statiques** (PNG, SVG, JPG). Le `bin` `atlas-logos-install` a été retiré (**breaking change**) — l'outil est maintenant dans `@univ-lehavre/atlas-logos-cli`.
- `@univ-lehavre/atlas-logos-cli` est nouveau. Il expose le `bin` `atlas-logos-install <target-dir>` qui résout `@univ-lehavre/atlas-logos` via `createRequire` et copie les fichiers dans le répertoire cible.
- Les apps `amarre`, `ecrin` et `find-an-expert` consomment désormais `@univ-lehavre/atlas-logos-cli` dans `devDependencies` (au lieu de `@univ-lehavre/atlas-logos` dans `dependencies`). Le script `prepare` reste inchangé : `atlas-logos-install static/logos`.

Migration pour un consommateur externe utilisant le bin :

```diff
- "dependencies": { "@univ-lehavre/atlas-logos": "^1.2.0" }
+ "devDependencies": { "@univ-lehavre/atlas-logos-cli": "^1.0.0" }
```

Aucun changement pour les consommateurs qui importent directement les fichiers (`@univ-lehavre/atlas-logos/ulhn.svg`, etc.) : ce chemin reste identique en 2.0.0.
