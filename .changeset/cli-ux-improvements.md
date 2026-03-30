---
"@univ-lehavre/atlas-researcher-profiles": minor
---

feat(researcher-profiles): fluidifier l'interface CLI

- `--batch` / `--yes` : auto-accepte les sélections de fullnames sans prompt interactif
- Séparateurs visuels entre chercheurs avec compteur [1/N]
- Temps écoulé affiché par chercheur
- Spinner pendant l'extraction de texte (30-60s sans feedback auparavant)
- Threshold affiché au début de match-references et dans chaque résumé
- Quota OpenAlex affiché après le 1er chercheur (pas uniquement en fin de session)
- Cancel gracieux : Ctrl+C sur le multiselect fullnames skip le chercheur au lieu de quitter le CLI
- Notes françaises remplacées par de l'anglais pour cohérence
