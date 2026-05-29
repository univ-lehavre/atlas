# 0005 — Effect pour la programmation fonctionnelle

## Contexte

Le monorepo manipule beaucoup d'opérations qui peuvent échouer
proprement : appels HTTP vers des API externes (REDCap, Appwrite,
OpenAlex), parsing de structures arbitraires (CSV, OpenAPI), validation
de payloads. Le pattern « lancer une exception et rattraper plus haut »
multiplie les chemins d'erreur invisibles et masque les cas où une
fonction peut échouer.

L'alternative est de typer les erreurs comme valeurs de retour. Plusieurs
écoles existent : `Result<T, E>` à la Rust, `Either<E, A>` à la fp-ts,
ou la bibliothèque [Effect](https://effect.website/) qui généralise ce
modèle aux opérations asynchrones, à la concurrence, et à l'injection
de dépendances (modules `Layer`, ressources, fibres).

Effect a été retenu parce qu'il couvre l'ensemble des besoins du
monorepo (erreurs typées, async, retry, timeout, ressources, tests
déterministes) sans imposer une seconde bibliothèque pour la concurrence
ou les dépendances.

## Décision

**Effect** est la bibliothèque de programmation fonctionnelle de
référence dans le monorepo. Les erreurs sont des **valeurs typées**,
pas des exceptions : une fonction qui peut échouer retourne
`Effect<A, E>` où `E` énumère les modes d'échec.

Les patterns Effect (et l'interop Hono côté services) sont **explicitement
autorisés** malgré les règles ESLint fonctionnelles strictes qui sinon
banniraient certaines constructions (par exemple la composition par
opérateurs `pipe`/`yield*`).

## Statut

Accepted.

## Conséquences

**Bénéfices.** Les modes d'échec d'une fonction sont lisibles dans sa
signature. Les tests peuvent simuler une erreur précise au lieu de
déclencher une exception générique. Les opérations composées (retry,
timeout, fallback) deviennent déclaratives. L'injection de dépendances
via `Layer` rend les tests d'intégration plus propres que via des mocks
ad hoc.

**Prix à payer.** Effect a une courbe d'apprentissage non triviale ; un
contributeur sans exposition préalable à fp-ts/ZIO/cats-effect met du
temps à devenir productif. Le code utilisant `pipe`/`yield*` est moins
lisible pour un œil habitué à `async/await`. La taille des bundles
publiés est sensible à l'inclusion d'Effect (mitigé via `peerDependencies`
sur les paquets publiés).

**Garde-fous.**

- Les exceptions JavaScript (`throw`) restent autorisées aux frontières
  système (CLI, point d'entrée HTTP) où elles deviennent des codes
  d'erreur observables ; au cœur du code métier, les erreurs sont
  typées.
- Toute nouvelle bibliothèque concurrente (rxjs, fp-ts, etc.) demande
  un ADR explicite qui motive l'écart par rapport à Effect.
- Voir [docs/architecture/tech-choices.md](../architecture/tech-choices.md)
  pour la rationale détaillée et les patterns de référence.
