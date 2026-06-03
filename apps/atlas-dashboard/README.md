# @univ-lehavre/atlas-dashboard

Outil interne de **suivi des paquets publiés** du monorepo : une application web
qui présente les statistiques **npm et GitHub** des paquets `@univ-lehavre/atlas-*`
— nombre de _releases_, paquets actifs, téléchargements et leur tendance.

Ce n'est pas une application produit destinée à des utilisateurs finaux, mais un
**tableau de bord d'observation du dépôt**. Les données proviennent du paquet
[`@univ-lehavre/atlas-stats`](https://github.com/univ-lehavre/atlas/blob/main/packages/atlas-stats/README.md) (API GitHub
Releases + registre npm), mises en cache et rafraîchies à la demande.

## Ce qu'il affiche

- **Releases** publiées sur la période choisie (jour / semaine / mois / trimestre) ;
- **Paquets** total et actifs sur la période ;
- **Téléchargements** npm, total et par paquet, avec une courbe de tendance.

> Les indicateurs de **robustesse du code** (couverture, lignes, dette, sécurité)
> et leur évolution sont documentés ailleurs, sur la page
> [Tableau de bord](https://univ-lehavre.github.io/atlas/quality/tableau-de-bord)
> de la documentation — univers de données distinct (analyse du dépôt, pas
> statistiques npm).

Documentation en ligne : <https://univ-lehavre.github.io/atlas/>
