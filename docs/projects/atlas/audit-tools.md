# Audit et qualite du code

Cette section documente les mesures de qualite du code mises en place dans le monorepo Atlas, les outils utilises, et les recommandations pour ameliorer la coherence.

## Vue d'ensemble

Atlas utilise plusieurs outils d'audit pour garantir la qualite, la securite et la maintenabilite du code.

```bash
# Lancer tous les audits
pnpm ci:audit

# Ou individuellement
pnpm audit:security     # Vulnerabilites des dependances
pnpm audit:licenses     # Conformite des licences
pnpm audit:unused       # Code inutilise
pnpm audit:duplicates   # Code duplique
pnpm audit:size         # Taille des bundles
pnpm audit:versions     # Dependances obsoletes
```

## Outils d'audit

### Securite des dependances

| Outil | Commande | Description |
|-------|----------|-------------|
| pnpm audit | `audit:security` | Detecte les vulnerabilites connues (CVE) dans les dependances |

```bash
pnpm audit --audit-level=high
```

Seules les vulnerabilites de niveau `high` ou `critical` bloquent la CI.

### Conformite des licences

| Outil | Commande | Description |
|-------|----------|-------------|
| license-checker | `audit:licenses` | Verifie que toutes les dependances utilisent des licences autorisees |

Licences autorisees :
- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC
- 0BSD
- Unlicense

### Detection du code inutilise

| Outil | Commande | Description |
|-------|----------|-------------|
| knip | `audit:unused` | Detecte les exports, fichiers et dependances non utilises |

```bash
knip --exclude unresolved,types
```

Les erreurs `unresolved` et `types` sont exclues pour eviter les faux positifs lies aux types generes.

### Detection du code duplique

| Outil | Commande | Description |
|-------|----------|-------------|
| jscpd | `audit:duplicates` | Detecte les blocs de code copie-colle |

```bash
jscpd --pattern "packages/*/src/**/*.ts" --pattern "apps/*/src/**/*.ts"
```

### Taille des bundles

| Outil | Commande | Description |
|-------|----------|-------------|
| size-limit | `audit:size` | Verifie que les bundles ne depassent pas les limites definies |

Limites actuelles (definies dans `package.json`) :

| Package | Limite |
|---------|--------|
| @univ-lehavre/crf | 100 KB |
| @univ-lehavre/net | 20 KB |

### Dependances obsoletes

| Outil | Commande | Description |
|-------|----------|-------------|
| taze | `audit:versions` | Liste les dependances avec des mises a jour disponibles |

```bash
taze -r  # Mode recursif pour le monorepo
```

## Verification du code Svelte

Les packages SvelteKit disposent d'une verification specifique via `svelte-check` :

```bash
pnpm svelte:check  # Verifie tous les packages Svelte
```

Cette commande est executee dans :
- Le pre-commit (lefthook)
- La CI (job typecheck)

## Integration CI/CD

### Jobs de la CI

| Job | Scripts executes |
|-----|------------------|
| lint | `format:check`, `lint` |
| typecheck | `typecheck`, `svelte:check` |
| test | `test:coverage` |
| build | `build` |
| audit | `audit:security`, `audit:licenses`, `audit:unused`, `audit:duplicates`, `audit:size`, `audit:versions` |

### Hooks pre-commit (lefthook)

| Hook | Scripts executes |
|------|------------------|
| format | `format:check` |
| lint | `lint` |
| cpd | `audit:duplicates` |
| knip | `audit:unused` |
| test | `test:coverage` |
| typecheck | `typecheck` |
| svelte:check | `svelte:check` |

### Hooks pre-push (lefthook)

| Hook | Scripts executes |
|------|------------------|
| check-branch | Interdit le push direct sur `main` |
| check-sync | Avertit si la branche n'est pas a jour |
| check-audit | `audit:security` |
| check-licenses | `audit:licenses` |
| check-lockfile | `pnpm install --frozen-lockfile` |

## Incoherences identifiees

### 1. Scripts `ci` vs jobs CI

Le script `ci` du `package.json` et les jobs de la CI GitHub Actions executent les memes verifications mais de maniere differente :

| Aspect | Script `ci` | Jobs CI |
|--------|-------------|---------|
| Execution | Sequentielle | Parallele |
| Echec | Arret au premier echec | Jobs independants |

**Recommandation** : Cette difference est intentionnelle. Le script `ci` est utile pour les verifications locales rapides, tandis que la CI parallele optimise le temps d'execution.

### 2. Build redondant dans la CI

Chaque job de la CI execute `pnpm build` avant ses verifications (car turbo cache les resultats). Cela est necessaire car certaines verifications (`typecheck`, `svelte:check`, `test`) dependent du build.

**Recommandation** : Conserver ce comportement. Le cache Turbo evite les rebuilds inutiles.

### 3. Couverture des audits

| Environnement | `audit:size` | `audit:versions` |
|---------------|--------------|------------------|
| CI | Job audit | Job audit |
| Lefthook pre-commit | Non | Non |
| Lefthook pre-push | Non | Non |

**Recommandation** : Ne pas ajouter ces audits aux hooks locaux car ils sont lents et moins critiques pour le developpement quotidien.

## Ameliorations futures

### Court terme

1. **Seuils jscpd** : Configurer des seuils de duplication acceptables dans un fichier `.jscpd.json`
2. **Reporter knip** : Ajouter un format de sortie JSON pour integration avec d'autres outils

### Moyen terme

1. **Dependabot/Renovate** : Automatiser les mises a jour de dependances au lieu de `taze` manuel
2. **CodeQL** : Ajouter une analyse statique de securite plus avancee

### Long terme

1. **SonarQube** : Integration pour une vue consolidee de la qualite du code
2. **Metriques de couverture** : Publier les rapports de couverture de tests

## References

- [pnpm audit](https://pnpm.io/cli/audit)
- [license-checker](https://github.com/davglass/license-checker)
- [knip](https://knip.dev/)
- [jscpd](https://github.com/kucherenko/jscpd)
- [size-limit](https://github.com/ai/size-limit)
- [taze](https://github.com/antfu/taze)
- [svelte-check](https://github.com/sveltejs/language-tools/tree/master/packages/svelte-check)
