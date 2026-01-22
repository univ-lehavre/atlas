# Architecture

## Programmation fonctionnelle avec Effect

Ce projet adopte une approche de **programmation fonctionnelle** avec [Effect](https://effect.website/), une bibliotheque TypeScript pour construire des applications robustes et type-safe.

### Pourquoi Effect ?

- **Gestion d'erreurs type-safe** : Les erreurs sont traitees comme des valeurs, pas des exceptions
- **Composabilite** : Code modulaire et reutilisable via `pipe` et les combinateurs
- **Observabilite integree** : Tracing et metriques compatibles OpenTelemetry
- **Gestion des ressources** : Acquisition et liberation automatiques (comme `try-with-resources`)
- **Concurrence structuree** : Interruption propre et gestion des fibres

## Configuration ESLint

Le projet utilise une configuration ESLint stricte combinant plusieurs plugins. Voir [@univ-lehavre/atlas-eslint-config](https://github.com/univ-lehavre/atlas/tree/main/packages/eslint-config) pour les details.

### TypeScript Strict

Base sur `tseslint.configs.strictTypeChecked` avec des regles additionnelles :

| Regle                         | Description                                    |
| ----------------------------- | ---------------------------------------------- |
| `strict-boolean-expressions`  | Interdit les coercions implicites en booleen   |
| `no-floating-promises`        | Oblige a gerer toutes les promesses            |
| `no-unnecessary-condition`    | Detecte les conditions toujours vraies/fausses |
| `consistent-type-imports`     | Force `import type` pour les imports de types  |
| `switch-exhaustiveness-check` | Verifie que tous les cas sont couverts         |
| `no-explicit-any`             | Interdit `any` (error, pas warn)               |

### Programmation Fonctionnelle

Base sur [eslint-plugin-functional](https://github.com/eslint-functional/eslint-plugin-functional) :

| Regle                       | Statut | Description                                       |
| --------------------------- | ------ | ------------------------------------------------- |
| `no-expression-statements`  | error  | Interdit les expressions sans retour              |
| `no-conditional-statements` | error  | Interdit if/switch (force les ternaires/matching) |
| `no-throw-statements`       | error  | Interdit throw (force Effect)                     |
| `no-try-statements`         | error  | Interdit try/catch (force Effect)                 |
| `immutable-data`            | error  | Interdit la mutation des objets/tableaux          |
| `no-classes`                | off    | Desactive (Effect utilise des classes)            |

### Securite

Base sur [eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security) :

| Regle                         | Description                            |
| ----------------------------- | -------------------------------------- |
| `detect-unsafe-regex`         | Detecte les regex vulnerables au ReDoS |
| `detect-eval-with-expression` | Interdit eval() avec des expressions   |
| `detect-object-injection`     | Avertit sur les acces dynamiques       |

### Qualite de Code

| Regle                    | Valeur | Description                               |
| ------------------------ | ------ | ----------------------------------------- |
| `max-depth`              | 4      | Profondeur max d'imbrication              |
| `max-lines-per-function` | 60     | Lignes max par fonction                   |
| `complexity`             | 15     | Complexite cyclomatique max               |
| `no-console`             | error  | Interdit console.log (allow: warn, error) |

### Patterns Effect ignores

Certains patterns sont explicitement autorises pour Effect et Hono :

```javascript
// Effect patterns
Effect.runPromise(...)
pipe(value, Effect.map(...))
Layer.succeed(...)

// Hono patterns (configuration des routes)
app.get('/path', handler)
records.post('/', handler)
```

### Fichiers de test

Les regles strictes sont desactivees pour les fichiers `*.test.ts` et `*.spec.ts` afin de permettre les patterns de test classiques.

## Scripts

### Script `ready`

Le script `pnpm ready` execute tous les checks avant une release. L'ordre est optimise selon le principe **fail-fast** : les verifications les plus rapides et les plus susceptibles d'echouer sont executees en premier.

```bash
pnpm check && pnpm typecheck && pnpm test && pnpm audit:all && pnpm build
```

**Ordre d'execution :**

1. **`check`** (format, lint, knip, cpd en parallele) - Tres rapide, echoue souvent sur des erreurs de style ou imports inutilises
2. **`typecheck`** - Rapide, detecte les erreurs de typage
3. **`test`** - Duree variable, mais essentiel avant les etapes suivantes
4. **`audit:all`** (audit + license:audit en parallele) - Verifications de securite et licences
5. **`build`** - Le plus long, execute en dernier car si les etapes precedentes echouent, inutile de builder

### Audit des licences

Le script `license:audit` verifie que toutes les dependances utilisent des licences autorisees :

```bash
pnpm license:audit
```

**Licences autorisees :**

| Licence          | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| **MIT**          | Licence tres permissive, la plus courante dans l'ecosysteme npm |
| **Apache-2.0**   | Permissive avec protection contre les brevets                   |
| **BSD-2-Clause** | Permissive, version simplifiee (2 clauses)                      |
| **BSD-3-Clause** | Permissive, version originale (3 clauses)                       |
| **ISC**          | Equivalente a MIT, simplifiee                                   |
| **0BSD**         | Domaine public, aucune restriction                              |
| **Unlicense**    | Domaine public explicite                                        |

**Pourquoi ces licences ?**

Toutes ces licences sont **permissives** et permettent :

- L'utilisation commerciale
- La modification du code
- La distribution
- L'utilisation privee

Elles n'imposent **pas** de partager le code source (contrairement aux licences copyleft comme GPL), ce qui est important pour un projet pouvant etre utilise dans des contextes varies.

## MCP Servers

Le projet est configure pour utiliser des serveurs [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) qui fournissent de la documentation et des outils aux assistants IA.

### Configuration

Les serveurs MCP sont configures dans `.mcp.json` :

```json
{
  "mcpServers": {
    "effect-mcp": {
      "command": "pnpm",
      "args": ["dlx", "@niklaserik/effect-mcp"]
    },
    "svelte-mcp": {
      "command": "pnpm",
      "args": ["dlx", "@sveltejs/mcp"]
    },
    "appwrite-docs": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp-for-docs.appwrite.io"]
    },
    "appwrite-api": {
      "command": "uvx",
      "args": ["mcp-server-appwrite", "--all"],
      "env": {
        "APPWRITE_PROJECT_ID": "${APPWRITE_PROJECT_ID}",
        "APPWRITE_API_KEY": "${APPWRITE_API_KEY}",
        "APPWRITE_ENDPOINT": "${APPWRITE_ENDPOINT}"
      }
    },
    "openalex": {
      "command": "npx",
      "args": ["openalex-mcp"]
    }
  }
}
```

### Serveurs disponibles

| Serveur         | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `effect-mcp`    | Documentation Effect.js                                    |
| `svelte-mcp`    | Documentation Svelte 5 et SvelteKit                        |
| `appwrite-docs` | Documentation Appwrite                                     |
| `appwrite-api`  | API Appwrite (requires env vars)                           |
| `openalex`      | API OpenAlex pour la recherche academique (240M+ articles) |

### Pre-requis

- **Node.js/npm** : Pour `effect-mcp`, `svelte-mcp`, `appwrite-docs`, `openalex`
- **uv (Python)** : Pour `appwrite-api` (`curl -LsSf https://astral.sh/uv/install.sh | sh`)

### Variables d'environnement pour Appwrite

Pour utiliser le serveur `appwrite-api`, configurez :

```bash
export APPWRITE_PROJECT_ID="votre_project_id"
export APPWRITE_API_KEY="votre_api_key"
export APPWRITE_ENDPOINT="https://appwrite.votredomaine.com/v1"
```
