# atlas

[![DOI](https://zenodo.org/badge/1137569222.svg)](https://doi.org/10.5281/zenodo.18310357)

## Scripts

### Script `ready`

Le script `pnpm ready` exécute tous les checks avant une release. L'ordre est optimisé selon le principe **fail-fast** : les vérifications les plus rapides et les plus susceptibles d'échouer sont exécutées en premier.

```
pnpm check && pnpm typecheck && pnpm test && pnpm audit:all && pnpm build
```

**Ordre d'exécution :**

1. **`check`** (format, lint, knip, cpd en parallèle) - Très rapide, échoue souvent sur des erreurs de style ou imports inutilisés
2. **`typecheck`** - Rapide, détecte les erreurs de typage
3. **`test`** - Durée variable, mais essentiel avant les étapes suivantes
4. **`audit:all`** (audit + license:audit en parallèle) - Vérifications de sécurité et licences
5. **`build`** - Le plus long, exécuté en dernier car si les étapes précédentes échouent, inutile de builder

### Audit des licences

Le script `license:audit` vérifie que toutes les dépendances utilisent des licences autorisées :

```bash
pnpm license:audit
```

**Licences autorisées :**

| Licence          | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| **MIT**          | Licence très permissive, la plus courante dans l'écosystème npm |
| **Apache-2.0**   | Permissive avec protection contre les brevets                   |
| **BSD-2-Clause** | Permissive, version simplifiée (2 clauses)                      |
| **BSD-3-Clause** | Permissive, version originale (3 clauses)                       |
| **ISC**          | Équivalente à MIT, simplifiée                                   |
| **0BSD**         | Domaine public, aucune restriction                              |
| **Unlicense**    | Domaine public explicite                                        |

**Pourquoi ces licences ?**

Toutes ces licences sont **permissives** et permettent :

- L'utilisation commerciale
- La modification du code
- La distribution
- L'utilisation privée

Elles n'imposent **pas** de partager le code source (contrairement aux licences copyleft comme GPL), ce qui est important pour un projet pouvant être utilisé dans des contextes variés.

## Architecture

### Programmation fonctionnelle avec Effect

Ce projet adopte une approche de **programmation fonctionnelle** avec [Effect](https://effect.website/), une bibliothèque TypeScript pour construire des applications robustes et type-safe.

**Pourquoi Effect ?**

- **Gestion d'erreurs type-safe** : Les erreurs sont traitées comme des valeurs, pas des exceptions
- **Composabilité** : Code modulaire et réutilisable via `pipe` et les combinateurs
- **Observabilité intégrée** : Tracing et métriques compatibles OpenTelemetry
- **Gestion des ressources** : Acquisition et libération automatiques (comme `try-with-resources`)
- **Concurrence structurée** : Interruption propre et gestion des fibres

### Configuration ESLint Stricte

Le projet utilise une configuration ESLint très stricte combinant plusieurs plugins :

#### TypeScript Strict

Basé sur `tseslint.configs.strictTypeChecked` avec des règles additionnelles :

| Règle                         | Description                                    |
| ----------------------------- | ---------------------------------------------- |
| `strict-boolean-expressions`  | Interdit les coercions implicites en booléen   |
| `no-floating-promises`        | Oblige à gérer toutes les promesses            |
| `no-unnecessary-condition`    | Détecte les conditions toujours vraies/fausses |
| `consistent-type-imports`     | Force `import type` pour les imports de types  |
| `switch-exhaustiveness-check` | Vérifie que tous les cas sont couverts         |
| `no-explicit-any`             | Interdit `any` (error, pas warn)               |

#### Programmation Fonctionnelle

Basé sur [eslint-plugin-functional](https://github.com/eslint-functional/eslint-plugin-functional) :

| Règle                       | Statut   | Description                                       |
| --------------------------- | -------- | ------------------------------------------------- |
| `no-expression-statements`  | ✅ error | Interdit les expressions sans retour              |
| `no-conditional-statements` | ✅ error | Interdit if/switch (force les ternaires/matching) |
| `no-throw-statements`       | ✅ error | Interdit throw (force Effect)                     |
| `no-try-statements`         | ✅ error | Interdit try/catch (force Effect)                 |
| `immutable-data`            | ✅ error | Interdit la mutation des objets/tableaux          |
| `no-classes`                | ⚠️ off   | Désactivé (Effect utilise des classes)            |

#### Sécurité

Basé sur [eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security) :

| Règle                         | Description                            |
| ----------------------------- | -------------------------------------- |
| `detect-unsafe-regex`         | Détecte les regex vulnérables au ReDoS |
| `detect-eval-with-expression` | Interdit eval() avec des expressions   |
| `detect-object-injection`     | Avertit sur les accès dynamiques       |

#### Qualité de Code

| Règle                    | Valeur | Description                               |
| ------------------------ | ------ | ----------------------------------------- |
| `max-depth`              | 4      | Profondeur max d'imbrication              |
| `max-lines-per-function` | 60     | Lignes max par fonction                   |
| `complexity`             | 15     | Complexité cyclomatique max               |
| `no-console`             | error  | Interdit console.log (allow: warn, error) |

#### Patterns Effect ignorés

Certains patterns sont explicitement autorisés pour Effect et Hono :

```javascript
// Effect patterns
Effect.runPromise(...)
pipe(value, Effect.map(...))
Layer.succeed(...)

// Hono patterns (configuration des routes)
app.get('/path', handler)
records.post('/', handler)
```

#### Fichiers de test

Les règles strictes sont désactivées pour les fichiers `*.test.ts` et `*.spec.ts` afin de permettre les patterns de test classiques.
