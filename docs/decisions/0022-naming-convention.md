# 0022 — Convention de nommage `atlas-` pour les paquets publiés

## Contexte

Les paquets publiés sur npm dans le monorepo portent le scope
`@univ-lehavre/` (organisation GitHub). À l'intérieur de ce scope, la
plupart des paquets sont nommés `@univ-lehavre/atlas-XXX` (où `XXX`
est leur fonction : `auth`, `crf-client`, `crf-stats-cli`…) — le
préfixe `atlas-` les rattache visuellement au projet monorepo.

Quelques paquets ont historiquement été nommés sans ce préfixe :

- `cli/crf-openapi` → `@univ-lehavre/atlas-crf-openapi` (préfixé)
- pas de paquet « legacy » sans `atlas-` à ce jour

Aussi, deux paquets coexistent sous le même token de nom :

- `packages/atlas-stats` → `@univ-lehavre/atlas-stats` (bibliothèque)
- `cli/atlas-stats` → `@univ-lehavre/atlas-stats-cli` (CLI consommateur)

C'est cohérent avec [ADR 0008](0008-clis-thins-logique-dans-packages.md)
(« CLIs thins, logique métier dans `packages/` ») : la bibliothèque
porte le token nu (`atlas-stats`) et le CLI ajoute le suffixe `-cli`.

Sans règle écrite, un nouveau paquet pourrait être nommé sans
préfixe, créant une dérive (ex. `@univ-lehavre/parser`).

## Décision

**Tous les paquets publiés** sur npm dans ce monorepo doivent porter
le préfixe `atlas-` après le scope `@univ-lehavre/`. La forme
canonique est :

```
@univ-lehavre/atlas-<token>[-cli]
```

où :

- `<token>` est le nom court de la bibliothèque (`auth`, `crf-client`,
  `citation-validate`, `researcher-profiles`…) ;
- le suffixe `-cli` est obligatoire pour les paquets de `cli/` (sauf
  dérogation explicite listée dans
  [ADR 0019](0019-derogations-workspace-audit.md), actuellement uniquement
  `cli/crf-openapi`).

### Pour les paquets privés

Les paquets `apps/*`, `sandbox/*` et helpers internes
(`ui/atlas-ui`, `packages/test-utils-sveltekit`) **suivent aussi** la
convention `atlas-` pour rester cohérents visuellement, même s'ils ne
sont jamais publiés. Le préfixe sert d'indicateur d'appartenance au
monorepo, pas uniquement de stratégie npm.

### Enforcement

`scripts/audit/workspace-structure.mjs` impose déjà :

- pour `apps/<dir>` : le nom doit être `@univ-lehavre/atlas-<dir>` ou
  `@univ-lehavre/<dir>` si `<dir>` commence déjà par `atlas-` ;
- pour `cli/<dir>` : le nom doit se terminer par `-cli` (sauf
  exception listée dans `NO_CLI_SUFFIX_ALLOWED`) ;
- la convention `atlas-` pour `packages/*`, `services/*`, `ui/*`,
  `config/*`, `assets/*` repose aujourd'hui sur la revue de code. Elle
  pourra être enforced ultérieurement si une régression est observée.

### Pas de renommage rétroactif

L'audit (finding 7) recommandait potentiellement de consolider
`packages/atlas-stats` + `cli/atlas-stats` sous un même nom. Cette
proposition **n'est pas retenue** : la séparation est conforme à
[ADR 0008](0008-clis-thins-logique-dans-packages.md) (CLI thin vs lib
métier) et la version actuelle (`atlas-stats` lib + `atlas-stats-cli`
CLI) est canonique. Un renommage n'apporterait aucune valeur et
casserait la liste d'allowed-scopes de commitlint.

## Statut

Accepted (2026-05-31).

## Conséquences

**Bénéfices.** Convention explicite et auditée. Un nouveau paquet ne
peut pas être créé sans préfixe sans qu'un humain le valide
explicitement (revue de code + éventuellement passage à
`audit:structure`). La lisibilité du registre npm
([npmjs.com/~univ-lehavre](https://www.npmjs.com/~univ-lehavre)) reste
cohérente : tous les paquets `atlas-XXX` regroupés.

**Prix à payer.** Si une bibliothèque devait à terme se détacher du
projet atlas (par exemple, `validators` devenir un paquet générique
utile à d'autres projets de l'organisation), il faudrait le renommer.
C'est volontairement plus visible qu'un changement de scope seul.

**Garde-fous.**

- Toute proposition de nom sans `atlas-` exige une dérogation listée
  dans [ADR 0019](0019-derogations-workspace-audit.md).
- L'audit semestriel passe la liste des paquets en revue ; si un
  préfixe différent émerge (par ex. `redcap-*`), cet ADR est superseded
  par un nouveau qui formalise la nouvelle convention.
