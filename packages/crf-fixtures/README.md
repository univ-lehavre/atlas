# @univ-lehavre/atlas-crf-fixtures

Parser de dictionnaire de données CRF (format CSV) et générateur déterministe
de faux records, pour construire des fixtures de test dans le monorepo atlas.

Deux briques indépendantes :

- `src/csv.ts` — parse l'export CSV standard d'un dictionnaire de données CRF
  (colonnes `field_name`, `form_name`, `field_type`, `field_label`,
  `select_choices_or_calculations`…) en structure typée.
- `src/fake.ts` — génère des records cohérents avec un dictionnaire donné, de
  façon **déterministe** (PRNG seedé, jamais de `Math.random` non-seedé).

## Parser de dictionnaire

```ts
import { parseDictionary, parseChoices } from '@univ-lehavre/atlas-crf-fixtures';

const dictionary = parseDictionary(csvContent);
// dictionary.fields: DictionaryField[]

const sex = dictionary.fields.find((f) => f.field_name === 'sex');
parseChoices(sex?.select_choices_or_calculations);
// => [{ code: '1', label: 'Male' }, { code: '2', label: 'Female' }]
```

Le parser accepte aussi bien les en-têtes verbeux de l'export
(`"Variable / Field Name"`, `"Choices, Calculations, OR Slider Labels"`, …)
que les en-têtes canoniques en snake_case (`field_name`, …). Les colonnes
optionnelles peuvent être absentes ; les colonnes inconnues sont ignorées.
Une `DictionaryParseError` est levée si le CSV est malformé, si une colonne
requise manque ou si un `field_type` est inconnu.

## Générateur de faux records

```ts
import { generateRecords } from '@univ-lehavre/atlas-crf-fixtures';

const records = generateRecords(dictionary, { count: 10, seed: 42 });
```

Garanties :

- **Déterministe** : même dictionnaire + même `seed` ⇒ mêmes records.
- **Cohérent** : les champs catégoriels (`dropdown`, `radio`) reçoivent un
  code valide du dictionnaire ; les `checkbox` sont éclatés en colonnes
  `field___code` ; les `text` avec validation `date*`/`integer` respectent
  leur format.
- **Champ identifiant** : par défaut le premier champ reçoit un id séquentiel
  (`"1"`, `"2"`, …) ; configurable via `recordIdField`.
- **Mode `sparse`** : optionnellement, certains champs optionnels sont laissés
  vides (de façon déterministe) pour simuler des données réelles parcellaires.

### Options

| Option          | Défaut        | Description                              |
| --------------- | ------------- | ---------------------------------------- |
| `count`         | `1`           | Nombre de records à générer.             |
| `seed`          | `1`           | Graine du PRNG déterministe.             |
| `recordIdField` | premier champ | Champ recevant l'id séquentiel.          |
| `sparse`        | `false`       | Laisse vides certains champs optionnels. |

## Scripts

```sh
pnpm --filter=@univ-lehavre/atlas-crf-fixtures build
pnpm --filter=@univ-lehavre/atlas-crf-fixtures typecheck
pnpm --filter=@univ-lehavre/atlas-crf-fixtures lint
pnpm --filter=@univ-lehavre/atlas-crf-fixtures test:coverage
```
