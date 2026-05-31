# Plan d'implémentation : matching de chercheurs

Pour la documentation des algorithmes, voir [ALGORITHMS.md](ALGORITHMS.md).

---

## Étapes

### 0. Étendre les types OpenAlex

**Fichier :** `packages/citation-types/src/api-results.ts`

Ajouter `TopicEntry` et `KeywordEntry`, les déclarer optionnels sur `WorksResult` :

```ts
interface TopicEntry {
  id: string;
  display_name: string;
  score: number;          // confiance 0–1 fournie par OpenAlex
  subfield: { id: string; display_name: string };
  field:    { id: string; display_name: string };
  domain:   { id: string; display_name: string };
}
interface KeywordEntry {
  id: string;
  display_name: string;
  score: number;
}
// Dans WorksResult :
topics?: TopicEntry[];
keywords?: KeywordEntry[];
```

### 1. Extraction et normalisation

**Fichier :** `packages/researcher-profiles/src/services/topic-extractor.ts`

- Itère `final_references` uniquement (travaux validés)
- Filtre topics avec `score < 0.3` (bruit)
- Produit `NormalizedWork[]` : `NormalizedTopic[]` + `NormalizedKeyword[]` (avec `id` et `score`)

### 2a. Profil TF-IDF

**Fichier :** `packages/researcher-profiles/src/services/tfidf-profile.ts`

- Vecteur creux `Map<string, number>` avec préfixes de niveau (`topic::`, `subfield::`, `field::`, `domain::`, et optionnellement `keyword::`)
- Option `includeKeywords` (défaut `false`) : active la dimension `keyword::` dans le vecteur
- Deux passes : TF bruts → IDF → normalisation L2
- `labels: Map<clé, display_name>` conservé dans le profil pour l'affichage
- Type exporté : `TfidfProfile { researcherId, vector, labels }`

### 2b. Profil embedding sémantique

**Fichier :** `packages/researcher-profiles/src/services/embedding-profile.ts`

- Concatène labels topic + keywords par travail en texte libre
- Encode via `@xenova/transformers` (`all-MiniLM-L6-v2`, 384 dims, ONNX, ~23 MB)
- Mean-pooling sur tous les travaux, normalisation L2
- Type exporté : `EmbeddingProfile { researcherId, vector: Float32Array }`

### 3. Scorer

**Fichier :** `packages/researcher-profiles/src/services/scorer.ts`

- `cosineSimilarity(a, b)` sur vecteurs TF-IDF creux
- `embeddingCosineSimilarity(a, b)` sur `Float32Array`
- `complementarityScore(a, b, { includeKeywords })` — formule multi-niveaux pondérée (voir ALGORITHMS.md)

### 4. Ensemble

**Fichier :** `packages/researcher-profiles/src/services/ensemble.ts`

- `similarity = 0.5 × tfidfSim + 0.5 × embeddingSim` (poids paramétrables via `EnsembleWeights`)
- Type exporté : `MatchScore { similarity, complementarity, tfidfSim, embeddingSim }`

### 5. Formatter

**Fichier :** `packages/researcher-profiles/src/services/match-formatter.ts`

`ResearcherMatch` contient :

- `scores: MatchScore`
- `explanation` : domaines, fields, subfields, topics distincts A/B, keywords partagés  
  (dérivé des vecteurs TF-IDF + labels, lisible sans les embeddings)

### 6. Commande CLI

**Fichier :** `cli/researcher-profiles/src/commands/match-researchers.ts`

```
atlas-researcher-profiles match-researchers [--top N] [--output json|table] [--complementarity] [--keywords] [--chart]
```

| Flag                | Défaut  | Description                                                                 |
| ------------------- | ------- | --------------------------------------------------------------------------- |
| `--top N`           | 20      | Nombre de paires à afficher                                                 |
| `--output`          | `table` | Format de sortie : `table` ou `json`                                        |
| `--complementarity` | off     | Trie par complémentarité au lieu de similarité                              |
| `--keywords`        | off     | Inclut les keywords OpenAlex dans les vecteurs TF-IDF et la complémentarité |
| `--chart`           | off     | Génère `matches.html` (scatter plot similarity × complementarity)           |

Pipeline :

1. Fetch tous les `ResearcherRow` REDCap
2. Fetch `oa_data` pour chacun (parallèle, concurrence 4)
3. Extraire `NormalizedWork[]` via `topic-extractor`
4. Construire profils TF-IDF (synchrone)
5. Construire profils embedding (async, spinner + progression)
6. Calcul pairwise O(N²) — trivial pour ~100 chercheurs
7. Tri et affichage via `match-formatter`
8. Si `--chart` : génère `matches.html` avec scatter plot SVG interactif (survol = détail de la paire)
