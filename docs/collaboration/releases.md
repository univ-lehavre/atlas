# Releases

_(à rédiger pour un public non-expert dans une PR ultérieure)_

Atlas publie ses packages (libs, CLI) sur le registre npm public sous le scope `@univ-lehavre`. Le mécanisme :

1. **Changesets** — chaque PR qui modifie un package publiable inclut un fichier `.changeset/*.md` décrivant le changement et son impact (patch / minor / major)
2. **PR « Version Packages »** — automatiquement créée par le bot `changesets/action`, elle agrège les changesets en bumps de version + CHANGELOG.md
3. **Publication npm** — le merge de cette PR déclenche `pnpm release` qui publie sur npm avec provenance OIDC (cf. [Sécurité](../quality/security.md))

Pour les apps (`apps/*`), pas de publication npm — elles sont déployées séparément.
