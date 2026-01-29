# Audit de la dette technique

> **Dernière mise à jour :** 29 janvier 2026

Ce document analyse l'équilibre entre réutilisation de bibliothèques existantes et risque de sur-dépendance dans le monorepo Atlas.

## Résumé exécutif

| Métrique | Valeur |
|----------|--------|
| Dépendances de production | 43 packages |
| Dépendances de développement | 47 packages |
| Packages internes (workspace) | 14 |
| Dépendances inutilisées identifiées | 3 |
| Duplications fonctionnelles | 4 |

---

## 1. Philosophie : réutiliser vs réinventer

### 1.1 Arguments pour la réutilisation

- **Gain de temps** : Ne pas recoder ce qui existe déjà
- **Qualité** : Bibliothèques testées par la communauté
- **Maintenance** : Mises à jour de sécurité externalisées
- **Documentation** : Ressources existantes

### 1.2 Risques de la sur-dépendance

- **Taille du bundle** : Impact sur les performances
- **Sécurité** : Surface d'attaque élargie
- **Maintenance** : Mises à jour en cascade
- **Obsolescence** : Bibliothèques abandonnées
- **Complexité** : Conflits de versions

---

## 2. Analyse des dépendances critiques

### 2.1 Écosystème Effect (justifié)

| Package | Utilisé par | Taille | Verdict |
|---------|-------------|--------|---------|
| `effect` | 5 packages | ~150KB | **Essentiel** - Architecture du projet |
| `@effect/platform` | 2 packages | ~50KB | **Justifié** - Abstractions plateforme |
| `@effect/cli` | 2 packages | ~30KB | **Justifié** - CLI typés |

**Conclusion** : L'écosystème Effect est le cœur architectural d'Atlas. La dette est acceptée.

### 2.2 Visualisation graphe (à surveiller)

| Package | Utilisé par | Taille | Verdict |
|---------|-------------|--------|---------|
| `graphology` | ecrin | ~100KB | **Justifié** - Pas d'alternative légère |
| `sigma` | ecrin | ~200KB | **Justifié** - WebGL performant |
| `graphology-layout-*` | ecrin | ~50KB | **À évaluer** - 3 plugins layout |

**Conclusion** : Ces dépendances sont lourdes mais essentielles pour ECRIN. Envisager l'extraction en package optionnel.

### 2.3 Utilitaires remplaçables

| Package | Utilisé par | Alternative native | Verdict |
|---------|-------------|-------------------|---------|
| `uuid` | ecrin | `crypto.randomUUID()` | **Remplaçable** |
| `lodash` | ecrin | Méthodes Array/Object | **Partiellement remplaçable** |
| `luxon` | amarre, ecrin | `Intl.DateTimeFormat` | **À évaluer** |

---

## 3. Problèmes identifiés

### 3.1 Dépendances inutilisées

| Package | Emplacement | Action |
|---------|-------------|--------|
| `vue-chartjs` | racine | **Supprimer** - Jamais utilisé |
| `chart.js` | racine | **Supprimer** - Jamais utilisé |

### 3.2 Duplication Appwrite

Le package `ecrin` utilise **deux** clients Appwrite :

```json
{
  "appwrite": "21.5.0",      // Client navigateur
  "node-appwrite": "17.0.1"  // Client serveur
}
```

**Recommandation** : Utiliser uniquement `node-appwrite` côté serveur via `@univ-lehavre/atlas-appwrite`.

### 3.3 Versions désalignées

| Package | Versions trouvées | Recommandation |
|---------|-------------------|----------------|
| `simple-git` | 3.27.0 (root), 3.30.0 (find-an-expert) | Aligner sur 3.30.0 |

### 3.4 Validation fragmentée

- `zod` utilisé dans amarre et find-an-expert
- `@univ-lehavre/atlas-validators` existe mais n'utilise pas zod

**Recommandation** : Consolider la validation dans le package validators avec zod.

---

## 4. Dépendances à usage unique

Ces dépendances ne sont utilisées que dans un seul package :

| Package | Utilisé par | Justification |
|---------|-------------|---------------|
| `hono-rate-limiter` | crf | **Justifié** - Fonctionnalité spécifique |
| `openapi-response-validator` | ecrin | **À évaluer** - Lourd pour un seul usage |
| `@stoplight/prism-cli` | crf (dev) | **Justifié** - Mock server pour tests |
| `swagger-ui-dist` | find-an-expert | **Justifié** - Documentation API |

---

## 5. Ce qui fonctionne bien

### 5.1 Configuration centralisée

`@univ-lehavre/atlas-shared-config` centralise :
- ESLint 9.x
- Prettier 3.x
- TypeScript 5.x

**Résultat** : Cohérence garantie, maintenance simplifiée.

### 5.2 Packages internes

Les 14 packages workspace évitent la duplication :
- `atlas-errors` : Gestion d'erreurs unifiée
- `atlas-validators` : Validation centralisée
- `atlas-appwrite` : Abstraction Appwrite
- `atlas-auth` : Authentification partagée

### 5.3 Écosystème cohérent

| Domaine | Choix | Cohérence |
|---------|-------|-----------|
| Frontend | Svelte 5 + SvelteKit 2 | 3/3 apps |
| Backend | Effect + Hono | 2/2 services |
| Tests | Vitest | 100% packages |
| Build | Vite + tsup | 100% packages |

---

## 6. Plan d'action

### Priorité 1 - Nettoyage immédiat

| Action | Impact | Effort |
|--------|--------|--------|
| Supprimer vue-chartjs et chart.js | Réduction dépendances | Faible |
| Aligner version simple-git | Cohérence | Faible |

### Priorité 2 - Optimisation

| Action | Impact | Effort |
|--------|--------|--------|
| Remplacer uuid par crypto.randomUUID() | -1 dépendance | Faible |
| Consolider clients Appwrite dans ecrin | -1 dépendance | Moyen |
| Évaluer remplacement lodash par natif | -1 dépendance | Moyen |

### Priorité 3 - Architecture

| Action | Impact | Effort |
|--------|--------|--------|
| Intégrer zod dans atlas-validators | Cohérence validation | Moyen |
| Extraire graphologie en package optionnel | Modularité | Élevé |

---

## 7. Métriques de suivi

```bash
# Compter les dépendances uniques
pnpm ls --depth 0 | wc -l

# Analyser les dépendances inutilisées
pnpm knip

# Vérifier les mises à jour disponibles
pnpm taze

# Auditer les vulnérabilités
pnpm audit
```

---

## 8. Conclusion

Le monorepo Atlas maintient un **équilibre raisonnable** entre réutilisation et contrôle :

- **Points forts** : Configuration centralisée, packages internes bien structurés, écosystème cohérent
- **Points d'amélioration** : Quelques dépendances inutilisées, duplication Appwrite, validation fragmentée

La dette technique liée aux dépendances reste **maîtrisée** grâce à :
1. L'utilisation de pnpm (déduplication efficace)
2. Les packages workspace (réutilisation interne)
3. Des choix technologiques cohérents (Effect, Svelte, Vite)
