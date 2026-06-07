---
title: Style de code
---

Atlas applique un ensemble unique de règles de style et de typage sur tout le dépôt. Ces règles sont vérifiées automatiquement par les [_hooks Git_](/atlas/quality/hooks/) (avant chaque commit) et par la CI (à chaque pull request). [**Git**](/atlas/glossary/) est le système de contrôle de version qui enregistre l'historique du code ; voir le [glossaire](/atlas/glossary/) pour les termes Git de base.

Chaque choix ci-dessous (typage strict, style fonctionnel, Effect) a un coût autant qu'un bénéfice. On les assume volontairement : cette page explique **pourquoi** Atlas les retient et **ce qu'ils coûtent**, pour qu'un contributeur sache à quoi s'attendre plutôt que de subir des règles non motivées.

## TypeScript strict

TypeScript est un langage qui ajoute des types à JavaScript : chaque variable, paramètre et valeur de retour est annotée, et le compilateur refuse de compiler si les types ne sont pas cohérents.

Atlas active le mode `strictTypeChecked` de `tseslint`, le plus strict disponible.

**Pourquoi.** Les types attrapent à la compilation une large classe d'erreurs (valeur `undefined` non gérée, mauvais argument, faute de frappe sur un champ) qui, sans eux, n'apparaîtraient qu'à l'exécution — voire en production. Ils servent aussi de documentation toujours à jour et fiabilisent les refactorisations : changer une signature fait remonter immédiatement tous les appels à corriger.

**À quel prix.** Le mode le plus strict est plus exigeant à écrire : il faut annoter, gérer explicitement les cas limites et parfois batailler avec le _type system_ pour exprimer une intention pourtant simple. Le compromis assumé : un coût d'écriture en amont contre des erreurs évitées en aval. L'alternative — JavaScript sans types, ou TypeScript en mode laxiste — est plus rapide à écrire mais déplace le coût vers le débogage et les régressions.

Les règles supplémentaires :

| Règle                         | Effet                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `strict-boolean-expressions`  | Interdit les coercions booléennes implicites (`if (value)` sur un nombre, par exemple) |
| `no-floating-promises`        | Oblige à gérer toutes les promesses (`await` ou `.then`)                               |
| `no-unnecessary-condition`    | Détecte les conditions toujours vraies ou toujours fausses                             |
| `consistent-type-imports`     | Force `import type` pour les imports purement de types                                 |
| `switch-exhaustiveness-check` | Vérifie que tous les cas d'un `switch` sur un type union sont couverts                 |
| `no-explicit-any`             | Interdit le type `any` (erreur, pas avertissement)                                     |

## Programmation fonctionnelle

La **programmation fonctionnelle** est un paradigme (une façon de structurer le code) qui privilégie les fonctions sans effet de bord, les données immuables — qu'on ne modifie pas après création — et les erreurs représentées comme des valeurs plutôt que comme des exceptions lancées. Atlas l'adopte via [eslint-plugin-functional](https://github.com/eslint-functional/eslint-plugin-functional).

**Pourquoi.** Un code immuable et sans effet de bord caché est plus prévisible : une fonction qui ne dépend que de ses arguments donne toujours le même résultat, donc se teste et se raisonne isolément. Représenter les erreurs comme des valeurs typées (plutôt que par `throw`) force à traiter explicitement les cas d'échec — le compilateur ne laisse pas passer un chemin d'erreur oublié.

**À quel prix.** Le style est plus contraignant et dépayse qui vient d'un JavaScript impératif : interdire `if`/`throw`/`try`/`catch` (voir le tableau) oblige à réécrire des motifs courants avec des ternaires, du _pattern matching_ ou des combinateurs. La courbe d'apprentissage est réelle, et certains algorithmes s'expriment plus naturellement de façon impérative. Le compromis assumé : une gêne ponctuelle à l'écriture contre des erreurs d'état et des effets de bord cachés en moins. C'est dans ce paradigme que s'inscrit **Effect** (section suivante), qui en est l'outil principal dans Atlas.

| Règle                       | Statut | Effet                                                                      |
| --------------------------- | ------ | -------------------------------------------------------------------------- |
| `no-expression-statements`  | erreur | Interdit les expressions sans valeur de retour utilisée                    |
| `no-conditional-statements` | erreur | Interdit `if`/`switch` (force l'usage de ternaires ou de pattern matching) |
| `no-throw-statements`       | erreur | Interdit `throw` (force l'usage d'Effect)                                  |
| `no-try-statements`         | erreur | Interdit `try`/`catch` (force l'usage d'Effect)                            |
| `immutable-data`            | erreur | Interdit la mutation d'objets et de tableaux                               |
| `no-classes`                | off    | Désactivé (Effect utilise des classes)                                     |

### Effect

[Effect](https://effect.website/) est une bibliothèque TypeScript qui met en œuvre concrètement le paradigme fonctionnel décrit ci-dessus : elle est l'outil par lequel Atlas applique « erreurs comme valeurs » et composition. Elle apporte :

- **Gestion d'erreurs typée** : les erreurs sont des valeurs avec un type, pas des exceptions
- **Composition** : des opérations s'assemblent avec `pipe` et des combinateurs
- **Observabilité native** : _tracing_ (suivi du parcours d'une requête) et métriques compatibles OpenTelemetry
- **Gestion de ressources** : acquisition et libération automatiques (équivalent `try-with-resources`)
- **Concurrence structurée** : interruption propre et gestion de _fibers_ (les unités de travail concurrentes d'Effect)

**À quel prix.** Effect est un investissement : son modèle (le type `Effect<A, E, R>`, les `Layer`, le `Context`) demande un temps d'apprentissage notable et ajoute une dépendance structurante à toute la base de code. Écrit en Effect, un bout de logique simple est plus verbeux qu'en JavaScript direct. Le compromis assumé : une montée en compétence et un peu de cérémonie contre une gestion d'erreurs, de ressources et de concurrence homogène et vérifiée par les types à l'échelle du dépôt. Le _pourquoi_ durable de ce choix est tracé dans l'[ADR 0005](/atlas/decisions/0005-effect-pour-la-pf/) ; cette page n'en donne que le résumé opérationnel.

Certains motifs Effect (et le framework HTTP Hono pour les services) sont explicitement autorisés malgré les règles fonctionnelles strictes :

```ts
// Effect
Effect.runPromise(...)
pipe(value, Effect.map(...))
Layer.succeed(...)

// Hono (déclaration de routes)
app.get('/path', handler)
records.post('/', handler)
```

## Sécurité statique

Règles issues de [eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security) :

| Règle                         | Effet                                                     |
| ----------------------------- | --------------------------------------------------------- |
| `detect-unsafe-regex`         | Détecte les expressions régulières vulnérables au _ReDoS_ |
| `detect-eval-with-expression` | Interdit `eval()` avec une expression                     |
| `detect-object-injection`     | Avertit sur les accès dynamiques à des propriétés d'objet |

## Qualité de code

| Règle                    | Valeur | Effet                                               |
| ------------------------ | ------ | --------------------------------------------------- |
| `max-depth`              | 4      | Profondeur d'imbrication maximale                   |
| `max-lines-per-function` | 60     | Nombre de lignes par fonction                       |
| `complexity`             | 15     | Complexité cyclomatique maximale                    |
| `no-console`             | erreur | Interdit `console.log` (autorise `warn` et `error`) |

## Fichiers de test

Les règles strictes sont assouplies pour `*.test.ts` et `*.spec.ts` afin d'autoriser les motifs classiques de test (assertions, mocks, fixtures).

## Format

[Prettier](https://prettier.io/) formate automatiquement le code à chaque commit. Aucun débat de style : la machine décide.

## Conventions de commit

Tous les messages de commit suivent [Conventional Commits](https://www.conventionalcommits.org/), vérifié par [commitlint](https://commitlint.js.org/) :

```
type(scope): description

[corps optionnel]

[footer optionnel]
```

Les principaux types : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`.

## Où voir la configuration

| Fichier                                                                                         | Contenu                        |
| ----------------------------------------------------------------------------------------------- | ------------------------------ |
| [`config/shared-config/`](https://github.com/univ-lehavre/atlas/tree/main/config/shared-config) | ESLint, TypeScript, Prettier   |
| [`eslint.config.js`](https://github.com/univ-lehavre/atlas/blob/main/eslint.config.js)          | Composition ESLint à la racine |
| [`.prettierrc`](https://github.com/univ-lehavre/atlas/blob/main/.prettierrc)                    | Options Prettier               |
| [`commitlint.config.js`](https://github.com/univ-lehavre/atlas/blob/main/commitlint.config.js)  | Règles commitlint              |
