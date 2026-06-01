# Style de code

Atlas applique un ensemble unique de règles de style et de typage sur tout le dépôt. Ces règles sont vérifiées automatiquement par les [_hooks Git_](./hooks.md) (avant chaque commit) et par la CI (à chaque pull request). [**Git**](../glossary.md) est le système de contrôle de version qui enregistre l'historique du code ; voir le [glossaire](../glossary.md) pour les termes Git de base.

## TypeScript strict

TypeScript est un langage qui ajoute des types à JavaScript : chaque variable, paramètre et valeur de retour est annotée, et le compilateur refuse de compiler si les types ne sont pas cohérents.

Atlas active le mode `strictTypeChecked` de `tseslint`, le plus strict disponible. Les règles supplémentaires :

| Règle                         | Effet                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `strict-boolean-expressions`  | Interdit les coercions booléennes implicites (`if (value)` sur un nombre, par exemple) |
| `no-floating-promises`        | Oblige à gérer toutes les promesses (`await` ou `.then`)                               |
| `no-unnecessary-condition`    | Détecte les conditions toujours vraies ou toujours fausses                             |
| `consistent-type-imports`     | Force `import type` pour les imports purement de types                                 |
| `switch-exhaustiveness-check` | Vérifie que tous les cas d'un `switch` sur un type union sont couverts                 |
| `no-explicit-any`             | Interdit le type `any` (erreur, pas avertissement)                                     |

## Programmation fonctionnelle

Atlas adopte un style fonctionnel via [eslint-plugin-functional](https://github.com/eslint-functional/eslint-plugin-functional) : les erreurs deviennent des valeurs typées, l'immutabilité est encouragée. Cf. [Effect](https://effect.website/) ci-dessous.

| Règle                       | Statut | Effet                                                                      |
| --------------------------- | ------ | -------------------------------------------------------------------------- |
| `no-expression-statements`  | erreur | Interdit les expressions sans valeur de retour utilisée                    |
| `no-conditional-statements` | erreur | Interdit `if`/`switch` (force l'usage de ternaires ou de pattern matching) |
| `no-throw-statements`       | erreur | Interdit `throw` (force l'usage d'Effect)                                  |
| `no-try-statements`         | erreur | Interdit `try`/`catch` (force l'usage d'Effect)                            |
| `immutable-data`            | erreur | Interdit la mutation d'objets et de tableaux                               |
| `no-classes`                | off    | Désactivé (Effect utilise des classes)                                     |

### Effect

[Effect](https://effect.website/) est une bibliothèque TypeScript qui apporte :

- **Gestion d'erreurs typée** : les erreurs sont des valeurs avec un type, pas des exceptions
- **Composition** : des opérations s'assemblent avec `pipe` et des combinateurs
- **Observabilité native** : tracing et métriques compatibles OpenTelemetry
- **Gestion de ressources** : acquisition et libération automatiques (équivalent `try-with-resources`)
- **Concurrence structurée** : interruption propre et gestion de _fibers_

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
