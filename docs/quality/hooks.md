# Hooks Git (lefthook)

_(à rédiger pour un public non-expert dans une PR ultérieure)_

Atlas utilise [lefthook](https://github.com/evilmartians/lefthook) pour exécuter automatiquement des contrôles avant chaque commit et chaque push, garantissant qu'aucun code défaillant n'atteint le dépôt distant.

**Pre-commit** (rapide, sur les fichiers staged) :

- `gitleaks` — bloque les secrets accidentels
- `prettier --check` — formatage cohérent
- `eslint` — règles de qualité de code (par package)
- `tsc --noEmit` — vérification de types
- `svelte-check` — validation SvelteKit

**Pre-push** (plus lent, sur l'ensemble du repo) :

- `pnpm audit:security` — vulnérabilités de dépendances
- `pnpm audit:licenses` — licences compatibles
- `pnpm test:coverage` — suite complète + couverture
- `pnpm audit:duplicates` — détection de duplication de code
- `pnpm audit:unused` — détection de code mort (knip)

Configuration : [`lefthook.yml`](https://github.com/univ-lehavre/atlas/blob/main/lefthook.yml)
