# Atlas REDCap test fixtures

Data dictionaries REDCap-importables, anonymisés par substitution déterministe
de fake names (et **non** par redaction), destinés aux tests d'intégration
des packages Atlas qui interrogent l'API REDCap.

## Contenu

Chaque CSV est un export au format **REDCap Data Dictionary** (colonnes
standardisées), directement importable dans une instance REDCap via :

- UI : `Project Setup → Online Designer → Data Dictionary → Upload`
- API : `content=metadata, action=import, format=csv`

| Fichier                    | Projet source  | Utilisé par                                               |
| -------------------------- | -------------- | --------------------------------------------------------- |
| `atlas-amarre-v1.csv`      | AMARRE v1      | `apps/amarre`                                             |
| `atlas-ecrin-v2-alpha.csv` | ECRIN v2-alpha | `apps/ecrin`                                              |
| `atlas-ecrin-v1-beta.csv`  | ECRIN v1-beta  | `packages/researcher-profiles`, `cli/researcher-profiles` |

Le fichier [`index.json`](index.json) liste pour chaque fixture : titre,
instruments, nombre de champs, package(s) consommateur(s), nombre de
substitutions de fake-names appliquées.

## Substitutions appliquées

Les identifiants institutionnels (université, laboratoires) sont remplacés
par des fake names cohérents et déterministes. Cf.
[`scripts/crf-trame/fake-names-map.json`](../../scripts/crf-trame/fake-names-map.json)
pour la table complète.

Exemples :

- `Université Le Havre Normandie` → `Université Atlas de Test`
- `ULHN` → `UAT`
- `LMAH` → `AlphaLab`
- `LITIS` → `BetaLab`
- `GREAH` → `GammaLab`
- emails → `contact@test.example.org`
- téléphones FR → `+33 1 23 45 67 89`

Les `field_name` snake_case sont également pris en compte
(ex. `labo_ulhn` → `labo_uat`).

## Régénération

```bash
pnpm crf:fixtures:generate
```

Le script ([scripts/crf-trame/generate-test-fixtures.ts](../../scripts/crf-trame/generate-test-fixtures.ts))
fetch les data dictionaries en direct depuis le serveur REDCap configuré dans
`.env` racine (`REDCAP_API_URL`), en utilisant les tokens de
`redcap-token.csv`. Il applique la substitution de fake-names puis produit
les CSV au format REDCap.

Modifier la liste des projets cibles dans `TARGETS` au début du script si
besoin.

## Ce que les fixtures couvrent

- Schéma de champs (types, validations, choix multiples, branching logic) —
  utilisable pour tests de structure et de génération de formulaire
- Instruments (formulaires) avec leurs champs assignés
- Calculations et required-field flags

## Ce qu'elles ne contiennent pas

- Aucune donnée (records). Les tests doivent créer leurs propres records.
- Pas d'events / arms (les fixtures sont basées sur des projets non-longitudinaux ; les fixtures sandbox génériques couvrent le cas longitudinal).
- Pas de file uploads / signatures.

## Usage typique en tests

```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Lire le CSV pour ensemencer une instance REDCap de test :
const csv = readFileSync(
  resolve("fixtures/crf-projects/atlas-amarre-v1.csv"),
  "utf8",
);

// Puis POST via l'API REDCap :
//   content=metadata, action=import, format=csv, data=<csv>
```
