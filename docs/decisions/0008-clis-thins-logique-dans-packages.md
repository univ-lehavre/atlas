# 0008 — CLIs thins, logique métier dans `packages/`

## Contexte

Le monorepo expose plusieurs outils en ligne de commande
(`cli/crf`, `cli/net`, `cli/biblio`, `cli/researcher-profiles`,
`cli/logos`, etc.) qui partagent un trait commun : ils orchestrent une
**logique métier** déjà présente dans un paquet `packages/*` (ex.
`packages/crf-core`, `packages/citation`).

Si la logique vit dans le CLI, deux problèmes apparaissent : (1) elle
n'est pas réutilisable par les apps ou les services qui consommeraient
la même primitive, (2) la logique devient testable uniquement via
l'invocation du CLI (parsing d'args, sorties terminal), ce qui
complique les tests unitaires.

## Décision

Les CLIs (`cli/*`) restent **thins** : leur responsabilité se limite à

- parser les arguments et les options ;
- appeler une primitive exportée par un `packages/*` ;
- formater et écrire la sortie terminal (texte, table, JSON).

Toute la logique métier non triviale (fetch HTTP, transformation,
validation, persistance) vit dans `packages/*` et est testable
indépendamment du CLI.

L'enforcement passe par
[`scripts/audit/workspace-structure.mjs`](https://github.com/univ-lehavre/atlas/blob/main/scripts/audit/workspace-structure.mjs) :
les imports d'un `cli/*` vers un autre `cli/*` sont interdits, et la
structure attendue (`commands/`, `index.ts` thin) est vérifiée.

## Statut

Accepted.

## Conséquences

**Bénéfices.** Les primitives sont testées au niveau du paquet (rapide,
déterministe, pas d'I/O terminal). Les CLIs sont testés sur le parsing
d'args et le formatage de sortie — surface réduite, peu de logique à
couvrir. Une app SvelteKit ou un service Hono peut consommer la même
primitive sans dépendre d'un CLI.

**Prix à payer.** Un nouveau CLI demande la création (ou l'extension)
d'un paquet métier en parallèle, ce qui ajoute un ou deux fichiers au
diff initial. Le découpage exige parfois un effort de design (où poser
la frontière entre primitive et orchestration).

**Garde-fous.**

- `audit:structure` rejette les CLIs qui définissent leur logique
  inline.
- Le pattern attendu est documenté dans
  [docs/architecture/monorepo.md](../architecture/monorepo.md#cli).
- Les dérogations existantes (par exemple `cli/crf-openapi` qui n'a
  pas le suffixe `-cli`) sont listées dans [ADR 0019](0019-derogations-workspace-audit.md).
