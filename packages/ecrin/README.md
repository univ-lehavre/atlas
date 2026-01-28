# ECRIN

Plateforme de collaboration pour chercheurs.

## À propos

**ECRIN** est un module majeur d'Atlas permettant aux chercheurs de présenter leurs travaux, trouver des collaborateurs, visualiser les réseaux de recherche et gérer leurs données. L'application est organisée autour de 6 cartes fonctionnelles.

## Fonctionnalités

- **Présenter** : Partager sa question scientifique et ses références
- **Collaborer** : Créer des projets, constituer des équipes, trouver des experts
- **Explorer** : Visualiser son réseau personnel et le graphe communautaire
- **Demander** : Rechercher des données et des experts
- **Publier** : Partager ses données et actualités
- **Administrer** : Gérer son compte et ses enquêtes

## Stack technique

- **Frontend** : SvelteKit 2, Svelte 5, Bootstrap 5
- **Backend** : Appwrite (authentification, base de données)
- **Données** : REDCap (enquêtes)
- **Visualisation** : Sigma.js, Graphology, ForceAtlas2

## Scripts

```bash
pnpm -F ecrin dev      # Développement
pnpm -F ecrin build    # Build production
pnpm -F ecrin test     # Tests
pnpm -F ecrin lint     # ESLint
```

## Architecture : les 6 cartes

### Carte "Introduce" (Présenter)

| Sous-carte               | Description                 | Statut    |
| ------------------------ | --------------------------- | --------- |
| Ma question scientifique | Décrire sa recherche        | Interface |
| Mes références           | Référencer ses publications | Interface |

### Carte "Collaborate" (Collaborer)

| Sous-carte            | Description                   | Statut           |
| --------------------- | ----------------------------- | ---------------- |
| Créer mon projet      | Déclarer un projet            | Fonctionnel      |
| Constituer mon équipe | Rechercher des collaborateurs | Partiel          |
| Trouver un expert     | Se connecter avec des experts | → find-an-expert |
| Financer mon projet   | Rechercher des financements   | Interface        |

### Carte "Explore" (Explorer)

| Sous-carte           | Description                          | Statut      |
| -------------------- | ------------------------------------ | ----------- |
| Mon graphe           | Visualiser son réseau personnel      | Fonctionnel |
| Graphe communautaire | Voir les connexions de la communauté | Fonctionnel |

### Carte "Ask" (Demander)

| Sous-carte              | Description                 | Statut    |
| ----------------------- | --------------------------- | --------- |
| Données                 | Rechercher des données      | Interface |
| Expert par localisation | Trouver un expert par zone  | Interface |
| Expert par thématique   | Trouver un expert par sujet | Interface |

### Carte "Publish" (Publier)

| Sous-carte     | Description                 | Statut    |
| -------------- | --------------------------- | --------- |
| Mes données    | Publier des jeux de données | Interface |
| Mes actualités | Écrire des articles         | Interface |

### Carte "Administrate" (Administrer)

| Sous-carte              | Description           | Statut      |
| ----------------------- | --------------------- | ----------- |
| S'inscrire              | Créer un compte       | Fonctionnel |
| Se déconnecter          | Terminer la session   | Fonctionnel |
| Supprimer son compte    | Supprimer ses données | Fonctionnel |
| Télécharger son enquête | Exporter ses données  | Fonctionnel |
| Supprimer son enquête   | Supprimer de REDCap   | Fonctionnel |

## Sous-projets

| Application                          | Description                                       |
| ------------------------------------ | ------------------------------------------------- |
| [find-an-expert](../find-an-expert/) | Découverte d'expertise via publications et GitHub |
| [amarre](../amarre/)                 | Visualisation de réseaux de recherche             |

## Documentation

- [Audit ECRIN](../../docs/guide/audit/ecrin-audit.md) - Analyse complète des 6 cartes

## Organisation

Ce package fait partie d'**Atlas**, un ensemble d'outils développés par l'**Université Le Havre Normandie** pour faciliter la recherche et la collaboration entre chercheurs.

Atlas est développé dans le cadre de deux projets portés par l'Université Le Havre Normandie :

- **[Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)** : programme de recherche et de formation centré sur les enjeux maritimes et portuaires
- **[EUNICoast](https://eunicoast.eu/)** : alliance universitaire européenne regroupant des établissements situés sur les zones côtières européennes

---

<p align="center">
  <a href="https://www.univ-lehavre.fr/">
    <img src="../logos/ulhn.svg" alt="Université Le Havre Normandie" height="50">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://www.cptmp.fr/">
    <img src="../logos/cptmp.png" alt="Campus Polytechnique des Territoires Maritimes et Portuaires" height="50">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://eunicoast.eu/">
    <img src="../logos/eunicoast.png" alt="EUNICoast" height="50">
  </a>
</p>

## Licence

MIT
