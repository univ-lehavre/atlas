# Valeurs attendues — échantillon GKG (`gkg-sample`)

Source de vérité des tests déterministes de l'ingestion mediawatch (ADR 0057).
Régénérer les fichiers : `python fixtures/gkg-sample/generate.py`.

Le fichier `sample.gkg.csv` (et son ZIP `20260101120000.gkg.csv.zip`) contient
**4 documents** (lignes GKG 2.1, tab-delimited, 27 colonnes, sans en-tête).

## Mentions d'organisations projetées (`gkg.project_csv`)

La projection émet **une mention par organisation distincte par document**. Total
attendu : **4 mentions** (Harvard dédupliqué dans le document 1 ; le document 4 n'a
aucune organisation → ignoré).

| record_id        | date           | organization                       | source      | translated |
| ---------------- | -------------- | ---------------------------------- | ----------- | ---------- |
| 20260101120000-1 | 20260101120000 | Harvard University                 | example.com | false      |
| 20260101120000-1 | 20260101120000 | Acme Corporation                   | example.com | false      |
| 20260101120000-2 | 20260101120000 | Universite du Havre                | lemonde.fr  | true       |
| 20260101120000-3 | 20260101120000 | University of California, Berkeley | example.org | false      |

Points vérifiés par cet échantillon :

- **Déduplication intra-document** : « Harvard University » apparaît deux fois dans
  le document 1 (offsets 120 et 540) → **une seule** mention.
- **Offset retiré** : le suffixe `,<digits>` (offset caractère) est ôté du nom.
- **Virgule interne** : « University of California, Berkeley,42 » → le nom conserve
  sa virgule, seul l'offset final `,42` est retiré.
- **Multilingue** : le document 2 (article traduit, `TranslationInfo` non vide) est
  marqué `translated = true` ; son organisation francophone est dans le même champ
  que les anglophones (Translingual traduit en amont, ADR 0064).
- **Bruit non universitaire** : « Acme Corporation » est présent — il sera **écarté**
  par la classification (PR 3, ADR 0065), pas à l'ingestion.
- **Document sans organisation** : le document 4 ne produit aucune mention.

## Universités attendues après classification (PR 3, indicatif)

Sur les 4 organisations distinctes projetées, **3** sont des universités
(« Harvard University », « Universite du Havre », « University of California,
Berkeley ») ; « Acme Corporation » est écartée. Valeurs détaillées consignées à
l'arrivée de la classification (PR 3).
