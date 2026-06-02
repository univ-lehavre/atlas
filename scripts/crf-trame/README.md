# scripts/crf-trame

Génération des **trames de projets CRF** (dictionnaires de données) et des
fixtures de test associées, à partir des templates déclaratifs des applications.

Ces scripts produisent les jeux de données importables dans une instance REDCap
qui servent aux tests d'intégration des paquets consommant l'API REDCap.

## Contenu

| Fichier                       | Rôle                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `export-data-dictionaries.ts` | Exporte les dictionnaires de données au format REDCap (CSV) depuis les templates Effect.                |
| `generate-test-fixtures.ts`   | Génère les fixtures anonymisées dans [`fixtures/crf-projects/`](../../fixtures/crf-projects/README.md). |
| `fake-names-map.json`         | Table de substitution déterministe (anonymisation par _fake names_, pas par _redaction_).               |
| `redact-patterns.json`        | Motifs de détection des valeurs à anonymiser.                                                           |

## Lancer

```bash
pnpm crf:dictionaries:export   # export-data-dictionaries.ts
pnpm crf:fixtures:generate     # generate-test-fixtures.ts
```

L'anonymisation est **déterministe** : un même nom source produit toujours le
même _fake name_, ce qui rend les fixtures reproductibles d'une génération à
l'autre.
