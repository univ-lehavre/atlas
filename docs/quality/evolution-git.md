# Évolution du dépôt

Cette page retrace l'**évolution mensuelle** du dépôt depuis ses débuts : pull
requests mergées, volume de code, activité, et robustesse. Toutes ces courbes
sont **dérivées de l'historique Git** — donc reproductibles à l'identique — et
vérifiées à jour en CI (classe A de l'[ADR 0032](../decisions/0032-kpi-determinisme-vs-snapshot.md)).

> **Page générée.** Le contenu ci-dessous est produit par
> `scripts/docs/generate-kpi-history.ts` à partir de `git log`. Ne l'éditez pas
> à la main : lancez `pnpm docs:generate` puis commitez le résultat. La
> robustesse est mesurée par **analyse statique** des arbres Git, jamais en
> exécutant les tests (la couverture mesurée, non reproductible, est historisée
> ailleurs — cf. [tableau de bord](./tableau-de-bord.md)).

> **Le mois en cours n'est pas affiché.** Seuls les **mois clos** figurent ici :
> un mois en cours change à chaque commit, ce qui périmerait la page à chaque
> _pull request_. La page ne fige donc que ce qui est définitivement stable
> (esprit de l'[ADR 0032](../decisions/0032-kpi-determinisme-vs-snapshot.md)).

## Pull requests mergées par mois

```mermaid
xychart-beta
    title "Pull requests mergées par mois"
    x-axis ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"]
    y-axis "PR"
    bar [20, 0, 8, 16, 85]
```

## Lignes de code par mois

```mermaid
xychart-beta
    title "Lignes ajoutées et supprimées par mois"
    x-axis ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"]
    y-axis "Lignes"
    line [209371, 8779, 15066, 28816, 70179]
    line [86237, 5696, 3189, 12730, 52728]
```

_Deux séries : lignes ajoutées (haute) et lignes supprimées (basse)._

## Commits et contributeurs par mois

```mermaid
xychart-beta
    title "Commits et contributeurs uniques par mois"
    x-axis ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"]
    y-axis "Nombre"
    line [86, 2, 19, 33, 104]
    line [3, 2, 2, 1, 3]
```

_Deux séries : commits (haute) et contributeurs uniques (basse)._

## Robustesse statique par mois

Mesurée par **analyse statique** du dernier arbre `--first-parent` de chaque
mois (jamais en exécutant les tests). Trois ratios, multipliés par 100 pour
la lisibilité :

```mermaid
xychart-beta
    title "Robustesse statique (ratios ×100)"
    x-axis ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"]
    y-axis "Ratio ×100"
    line [19.600, 19.600, 17, 24.600, 42.200]
    line [157.200, 157.200, 152.600, 140.800, 128.800]
    line [180.500, 180.500, 163.800, 187.700, 234.100]
```

_Trois séries : fichiers de test / fichiers source · commentaires TSDoc /
surface exportée · blocs de test / surface exportée._

| Mois    | Commit         | Tests/Source | TSDoc/Surface | Tests/Surface |
| ------- | -------------- | ------------ | ------------- | ------------- |
| 2026-01 | `3d8d2a740bb4` | 19.600       | 157.200       | 180.500       |
| 2026-02 | `36569427a4fe` | 19.600       | 157.200       | 180.500       |
| 2026-03 | `9f08556638a6` | 17           | 152.600       | 163.800       |
| 2026-04 | `ab331fc13b42` | 24.600       | 140.800       | 187.700       |
| 2026-05 | `84b8f12d2c47` | 42.200       | 128.800       | 234.100       |
