---
"@univ-lehavre/atlas-researcher-profiles": minor
"@univ-lehavre/atlas-validate-openalex": patch
---

feat(researcher-profiles): pipeline unifié par chercheur

- Nouveau mode par défaut : traite chaque chercheur de bout en bout (résolution OpenAlex + match publications) avant de passer au suivant, en s'appuyant sur les dates REDCap pour ignorer les étapes déjà à jour
- `cli/match-row.ts` : extraction de la logique de matching par chercheur (réutilisée par la commande standalone `match-references`)
- `cli/run.ts` : orchestrateur unifié remplaçant la cascade `from-redcap` → `match-references`
- Les commandes standalone `from-redcap` et `match-references` sont conservées

fix(validate-openalex): compatibilité avec `display_name: string | null` dans openalex-types
