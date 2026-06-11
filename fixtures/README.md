# fixtures

Jeux de données de test versionnés, **hors workspace** (ne sont pas des paquets
publiables). Ils servent aux tests d'intégration des paquets du monorepo.

| Sous-dossier                                      | Contenu                                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [`crf-projects/`](./crf-projects/README.md)       | Dictionnaires de données REDCap-importables, anonymisés, pour tester les paquets qui interrogent l'API REDCap.   |
| [`openalex-sample/`](./openalex-sample/README.md) | Échantillon **synthétique** OpenAlex (works/authors/merged_ids), pour les tests hermétiques du pipeline DataOps. |

Ces fixtures sont **générées** par
[`scripts/crf-trame/generate-test-fixtures.ts`](../scripts/crf-trame/README.md)
(commande `pnpm crf:fixtures:generate`) à partir des templates des applications,
et anonymisées par substitution déterministe de _fake names_ — aucune donnée
réelle n'y figure.
