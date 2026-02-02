# Documentation audit

> **Last updated:** 28 January 2026

This document presents a comprehensive audit of the Atlas monorepo documentation, identifying inconsistencies and proposing alignment recommendations.

## Résumé exécutif

L'audit révèle plusieurs axes d'amélioration :

| Catégorie | État | Priorité |
|-----------|------|:--------:|
| Identification institutionnelle | Absente ou incomplète | 🔴 Haute |
| Cohérence entre README et VitePress | Incohérente | 🔴 Haute |
| Chemins des logos | Cassés | 🟡 Moyenne |
| Couverture TSDoc | Variable selon packages | 🟢 Basse |

---

## 1. Documentation VitePress

### 1.1 Page d'accueil (`docs/index.md`)

**État actuel :** La page d'accueil est orientée exclusivement vers les outils techniques REDCap/API, sans mentionner :

- L'Université Le Havre Normandie comme propriétaire
- Les projets Campus Polytechnique des Territoires Maritimes et Portuaires et EUNICoast
- La plateforme ECRIN et ses applications
- Les logos des partenaires et financeurs

**Recommandation :** Refondre la page d'accueil pour inclure :

1. Une présentation orientée chercheurs
2. Les logos institutionnels (Université Le Havre Normandie, Campus Polytechnique des Territoires Maritimes et Portuaires, EUNICoast, France 2030, Région Normandie)
3. Les liens vers ECRIN et find-an-expert
4. Une section "Features" reflétant la diversité des outils

### 1.2 Guide principal (`docs/guide/index.md`)

**État actuel :** Mentionne correctement l'Université Le Havre Normandie mais :

- Ne présente pas les projets Campus Polytechnique des Territoires Maritimes et Portuaires et EUNICoast
- N'inclut pas de graphe d'architecture des packages
- Ne positionne pas find-an-expert comme sous-projet d'ECRIN

**Recommandation :** Ajouter :

1. Un graphe Mermaid montrant la hiérarchie des packages
2. Une section dédiée à ECRIN avec ses sous-projets
3. La mention des projets institutionnels

### 1.3 Configuration VitePress (`docs/.vitepress/config.ts`)

**État actuel :**

- Pas de section ECRIN dans la navigation latérale
- Pas de section find-an-expert
- Pas de footer avec logos partenaires

**Recommandation :**

1. Ajouter une section "ECRIN" dans la sidebar
2. Inclure find-an-expert et les audits
3. Configurer un footer avec les logos institutionnels

---

## 2. README racine

### 2.1 État actuel

Le fichier `README.md` à la racine du projet :

| Élément | Présent | Commentaire |
|---------|:-------:|-------------|
| Description technique | ✅ | Orientée développeurs |
| Mention Université Le Havre Normandie | ❌ | Aucune |
| Logos partenaires | ❌ | Aucun |
| Lien vers ECRIN | ❌ | Absent |
| Graphe d'architecture | ❌ | Absent |
| Badge DOI Zenodo | ✅ | Présent |

### 2.2 Recommandations

Restructurer le README avec :

1. **Section "À propos"** orientée public mixte (chercheurs + développeurs)
2. **Section "Projets"** présentant :
   - Campus Polytechnique des Territoires Maritimes et Portuaires
   - EUNICoast
3. **Graphe Mermaid** des packages
4. **Section "Partenaires"** avec logos
5. **Section technique** pour les développeurs

---

## 3. README des packages

### 3.1 Inventaire

| Package | README | État | Problèmes |
|---------|:------:|------|-----------|
| find-an-expert | ✅ | Bon | Chemins logos cassés (`./static/logos/` n'existe pas) |
| ecrin | ✅ | Minimal | Manque projets et description des 6 cartes |
| amarre | ✅ | Minimal | Documentation future |
| crf | ✅ | Excellent | Complet avec exemples |
| net | ✅ | Bon | Bien documenté |
| redcap-openapi | ✅ | Bon | Complet |
| shared-config | ✅ | Excellent | Tables comparatives |
| logos | ✅ | Correct | Liste des assets |
| appwrite | ❌ | Absent | À créer |
| auth | ❌ | Absent | À créer |
| errors | ❌ | Absent | À créer |
| validators | ❌ | Absent | À créer |

### 3.2 Problèmes identifiés

#### Chemins logos cassés

Le fichier `packages/find-an-expert/README.md` référence :

```markdown
<img src="./static/logos/cptmp.png" ...>
<img src="./static/logos/ulhn.svg" ...>
<img src="./static/logos/eunicoast.png" ...>
```

Or le dossier `packages/find-an-expert/static/logos/` n'existe pas. Les logos sont centralisés dans `packages/logos/`.

**Recommandation :** Utiliser des chemins relatifs vers `packages/logos/` ou copier les logos nécessaires.

#### README ECRIN incomplet

Le fichier `packages/ecrin/README.md` ne décrit pas :

- Les 6 cartes fonctionnelles (Introduce, Collaborate, Explore, Ask, Publish, Administrate)
- La relation avec find-an-expert
- Les projets Campus Polytechnique des Territoires Maritimes et Portuaires et EUNICoast

---

## 4. Couverture TSDoc

### 4.1 Analyse par package

| Package | Commentaires TSDoc | Fichiers sources | Couverture |
|---------|-------------------:|-----------------|:----------:|
| crf | ~203 | 15+ | ✅ Excellent |
| net | ~60 | 10 | ✅ Bon |
| redcap-openapi | ~73 | 18 | ✅ Bon |
| find-an-expert | Variable | 215+ | ⚠️ Moyen |

### 4.2 Observations

- **Packages Effect (crf, net)** : Bonne documentation des fonctions et types
- **Applications SvelteKit** : Les composants Svelte 5 utilisent les runes (`$state`, `$props`) mais peu de commentaires de documentation
- **Packages utilitaires** : Couverture variable

### 4.3 Recommandations

1. Prioriser la documentation TSDoc pour les fonctions exportées publiquement
2. Documenter les interfaces et types partagés
3. Ajouter des exemples d'utilisation dans les commentaires `@example`

---

## 5. Incohérences majeures

### 5.1 Double source de logos

**Problème :** Les logos existent dans `packages/logos/` mais certains README tentent de les charger depuis des chemins locaux inexistants.

**Solution :** Standardiser l'utilisation de `packages/logos/` comme source unique.

### 5.2 Public cible incohérent

**Problème :**

- Le README racine est technique (développeurs)
- Le guide VitePress cible les chercheurs
- Pas de pont entre les deux

**Solution :** Restructurer le README pour adresser les deux publics avec des sections distinctes.

### 5.3 Abréviations non standardisées

**Problème :** Utilisation mixte d'abréviations et noms complets.

**Solution :** Établir une convention : toujours utiliser les noms complets dans la documentation.

| Abréviation | Nom complet |
|-------------|-------------|
| ULHN | Université Le Havre Normandie |
| CPTMP | Campus Polytechnique des Territoires Maritimes et Portuaires |

---

## 6. Plan d'action

### Priorité haute

1. Refondre `README.md` racine avec identification institutionnelle
2. Refondre `docs/index.md` orienté chercheurs
3. Corriger les chemins de logos dans `find-an-expert/README.md`

### Priorité moyenne

4. Ajouter section ECRIN dans la navigation VitePress
5. Enrichir `packages/ecrin/README.md`
6. Créer `docs/guide/audit/ecrin-audit.md`

### Priorité basse

7. Améliorer couverture TSDoc des composants Svelte
8. Créer README pour packages utilitaires manquants

---

## 7. Logos disponibles

Le package `@univ-lehavre/atlas-logos` contient :

| Fichier | Description | Usage recommandé |
|---------|-------------|------------------|
| `ulhn.svg` | Université Le Havre Normandie | Identification propriétaire |
| `cptmp.png` | Campus Polytechnique des Territoires Maritimes et Portuaires | Projet porté par l'Université Le Havre Normandie |
| `eunicoast.png` | EUNICoast | Projet porté par l'Université Le Havre Normandie |
| `france-2030.png` | France 2030 | Financeur |
| `region-normandie.jpg` | Région Normandie (haute qualité) | Partenaire |
| `region-normandie.png` | Région Normandie (compacte) | Usage web optimisé |
| `ecrin-color.png` | ECRIN (couleur) | Application principale |
| `ecrin-bw.png` | ECRIN (noir et blanc) | Usage alternatif |
| `find-an-expert.svg` | Find an Expert | Sous-projet |
| `amarre.png` | AMARRE | Sous-projet |
| `amarre-icon.png` | AMARRE (icône) | Usage compact |
