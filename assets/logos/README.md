# @univ-lehavre/atlas-logos

Assets graphiques partagés des projets Atlas.

Ce paquet ne contient **que des fichiers statiques** (PNG, SVG, JPG) : aucun code exécutable, aucune dépendance runtime. Il est consommé par les apps du monorepo via [`@univ-lehavre/atlas-logos-cli`](../../cli/logos/), qui copie ces fichiers dans le dossier `static/` d'une app SvelteKit.

## Contenu

| Fichier                                         | Description                        |
| ----------------------------------------------- | ---------------------------------- |
| `amarre.png`                                    | Logo de l'app AMARRE               |
| `amarre-icon.png`                               | Icône de l'app AMARRE              |
| `ecrin-bw.png`                                  | Logo ECRIN (noir et blanc)         |
| `ecrin-color.png`                               | Logo ECRIN (couleur)               |
| `find-an-expert.svg`                            | Logo Find an Expert                |
| `cptmp.png`                                     | Logo partenaire CPTMP              |
| `eunicoast.png`                                 | Logo partenaire EUNICoast          |
| `france-2030.png`                               | Logo France 2030                   |
| `region-normandie.png` / `region-normandie.jpg` | Logo Région Normandie              |
| `ulhn.svg`                                      | Logo Université Le Havre Normandie |

## Installer ces assets dans une app

Voir [`@univ-lehavre/atlas-logos-cli`](../../cli/logos/).
