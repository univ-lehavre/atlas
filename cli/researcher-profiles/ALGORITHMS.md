# Algorithmes de matching de chercheurs

Données source : `ResearcherData.final_references` (travaux validés) dans REDCap.  
Chaque `WorksResult` expose `topics` (hiérarchie OpenAlex + score) et `keywords`.

---

## Notions préliminaires

**Vecteur creux** : vecteur dont la quasi-totalité des dimensions vaut zéro. Ici, un chercheur n'a que quelques dizaines de topics sur les milliers que compte la taxonomie OpenAlex — le vecteur est donc creux. Avantage : on ne stocke que les dimensions non nulles, ce qui est économe en mémoire.

**Normalisation L2** : opération qui divise chaque composante d'un vecteur par sa norme euclidienne (`√(x₁² + x₂² + … + xₙ²)`), de sorte que le vecteur résultant ait une longueur de 1. Elle permet de comparer des chercheurs avec des volumes de publications très différents : un chercheur avec 5 publications et un autre avec 50 auront des profils comparables une fois normalisés.

**Similarité cosinus** : mesure de l'angle entre deux vecteurs. Le résultat est compris entre 0 (aucune dimension commune, angle de 90°) et 1 (même direction, profils identiques). Lorsque les deux vecteurs sont déjà normalisés L2, le calcul se réduit à leur **produit scalaire** `A · B = Σ aᵢ × bᵢ` (somme des produits terme à terme), ce qui est très rapide.

---

## 2a — TF-IDF sur la taxonomie OpenAlex

### Concept

Chaque chercheur est représenté par un **vecteur creux** dont les dimensions sont les entités de la taxonomie OpenAlex (topic, subfield, field, domain, et optionnellement keywords) présentes dans ses travaux. La valeur de chaque dimension est le produit **TF × IDF** :

- **TF (term frequency)** : somme des scores de confiance OpenAlex pour cette dimension sur l'ensemble des travaux du chercheur. Un chercheur qui publie beaucoup sur `Organic Chemistry` avec des scores élevés aura une forte valeur TF pour ce topic.
- **IDF (inverse document frequency)** : `log(N / (df + 1) + 1)` où N est le nombre total de chercheurs et df (*document frequency*) le nombre de chercheurs ayant cette dimension dans leur profil. Une dimension présente chez tous les chercheurs (ex : `Physical Sciences`) est peu discriminante → faible IDF. Une spécialité rare → IDF élevé.

Le vecteur final est **normalisé L2**, ce qui permet de comparer des chercheurs avec des volumes de publications très différents.

La **similarité** entre deux chercheurs est la **similarité cosinus** entre leurs vecteurs, comprise entre 0 et 1.

La **complémentarité** exploite la hiérarchie à quatre niveaux via une formule pondérée (voir section Scorer).

### Implémentation en deux passes obligatoires

Une seule passe ne suffit pas : l'IDF nécessite de connaître df pour chaque dimension, ce qui n'est possible qu'après avoir parcouru tous les chercheurs.

1. **Passe 1** — accumulation des TF bruts pour chaque chercheur → `Map<dimensionKey, tf>`
2. **Passe 2** — calcul des df globaux → pondération IDF → normalisation L2

Les clés de dimension utilisent un préfixe de niveau pour éviter les collisions et permettre de filtrer par niveau :

```
topic::https://openalex.org/T10871   → "Organic Chemistry"
subfield::https://openalex.org/SF42  → "Polymer Science"
field::https://openalex.org/F16      → "Chemistry"
domain::https://openalex.org/D3      → "Physical Sciences"
keyword::https://openalex.org/K123   → "photocatalysis"
```

Un `labels: Map<clé, display_name>` est conservé dans le profil pour l'affichage humain.

### Avantages

- **Interprétable** : chaque dimension a un libellé OpenAlex explicite, les scores sont traçables jusqu'aux publications.
- **Exploite la hiérarchie** : permet de distinguer similarité (topic) et complémentarité (domain vs topic) nativement.
- **Rapide** : calcul synchrone, pas de modèle externe, O(N × W × T) où W = nombre de travaux et T = topics par travail.
- **Fidèle aux données** : les scores OpenAlex sont des probabilités d'assignation thématique issues d'un modèle entraîné, pas des heuristiques.

### Inconvénients

- **Pas de sémantique** : `"Machine Learning"` et `"Deep Learning"` sont deux dimensions orthogonales même si sémantiquement proches. Deux chercheurs sur des topics voisins mais distincts auront une similarité TF-IDF artificiellement basse.
- **Dépend de la qualité OpenAlex** : si un travail n'a pas de topics (données manquantes ou score < 0.3), il ne contribue pas au profil.
- **IDF instable sur petits corpus** : avec 20 chercheurs, un topic vu par 2 chercheurs a un IDF très différent d'un topic vu par 1. Les scores varient fortement selon la taille du corpus.

---

## 2b — Embeddings sémantiques (all-MiniLM-L6-v2)

### Concept

Un **transformer** est un modèle de réseau de neurones qui traite du texte découpé en **tokens** (sous-unités de mots) et produit une représentation interne pour chaque token. Un **embedding** est la projection de ce texte dans un espace vectoriel dense (ici 384 dimensions) où la **proximité géométrique reflète la proximité sémantique** : deux phrases proches sémantiquement produisent des vecteurs proches (similarité cosinus élevée), même si elles n'utilisent pas les mêmes mots.

Le **mean-pooling** consiste à moyenner les vecteurs de tous les tokens d'un texte pour obtenir un vecteur unique représentatif de la phrase entière.

Pour chaque travail, le texte d'entrée est la concaténation des libellés de topics et de keywords : `"Organic Chemistry, Polymer Science, marine biology, photocatalysis"`. Le modèle produit un vecteur de 384 flottants via mean-pooling sur ses tokens.

Le profil d'un chercheur est la **moyenne** de ces vecteurs sur tous ses travaux, normalisée L2. La similarité entre deux profils est la similarité cosinus de leurs vecteurs agrégés.

### Modèle : `Xenova/all-MiniLM-L6-v2`

- **Distillé** de `microsoft/MiniLM-L6-H384-uncased` : un grand modèle a été utilisé pour entraîner un modèle plus petit à reproduire ses représentations, réduisant la taille sans trop perdre en qualité.
- **Fine-tuné** pour la similarité sémantique (tâche *sentence similarity*) : après distillation, le modèle a été entraîné spécifiquement sur des paires de phrases avec des scores de similarité humains, ce qui l'oriente vers cette tâche précise.
- 384 dimensions, ~23 MB en ONNX quantifié. **ONNX** (Open Neural Network Exchange) est un format standard pour sérialiser des modèles de ML indépendamment du framework d'entraînement (PyTorch, TensorFlow…). *Quantifié* signifie que les poids sont compressés de float32 (4 octets) vers int8 (1 octet), réduisant le modèle de ~90 MB à ~23 MB avec une dégradation négligeable sur les tâches de similarité sémantique.
- Tourne en Node.js via `@xenova/transformers` (ONNX Runtime WebAssembly) sans Python ni GPU.
- Téléchargé une seule fois dans `~/.cache/huggingface/`.
- Entraîné majoritairement sur de l'anglais ; performance dégradée sur textes multilingues.

### Avantages

- **Capture la synonymie** : `"Machine Learning"` et `"Apprentissage automatique"` ou `"Statistical Learning"` produisent des vecteurs proches.
- **Robuste aux gaps de taxonomie** : deux chercheurs sur des topics OpenAlex différents mais sémantiquement voisins seront correctement rapprochés.
- **Complémentaire au TF-IDF** : corrige exactement les faiblesses structurelles de l'approche symbolique.

### Inconvénients

- **Boîte noire** : impossible d'expliquer pourquoi deux profils sont proches à partir des vecteurs denses seuls. L'explication du match reste assurée par les vecteurs TF-IDF.
- **Latence au premier lancement** : téléchargement du modèle (~23 MB) + compilation ONNX. Les runs suivants utilisent le cache local.
- **Mean-pooling naïf** : la moyenne sur tous les travaux pondère également un article avec 1 topic et un article avec 10 topics. Une pondération par nombre de topics ou par score de confiance serait plus fidèle.
- **Texte d'entrée limité** : le modèle tronque à 512 tokens. Un chercheur très prolifique avec beaucoup de keywords verra ses travaux tronqués.
- **Pas de hiérarchie** : contrairement au TF-IDF, on ne peut pas distinguer la similarité au niveau domain vs topic. La complémentarité ne peut donc pas être calculée depuis les embeddings.

---

## 3 & 4 — Du profil au score final : scorer + ensemble

Ces deux étapes forment un pipeline linéaire : le scorer calcule trois valeurs brutes à partir des profils, l'ensemble les combine en scores finaux.

```
TfidfProfile(A), TfidfProfile(B)         ──► tfidfSim        ──┐
                                         ──► complementarity    │
                                                                ├──► MatchScore
EmbeddingProfile(A), EmbeddingProfile(B) ──► embSim          ──┘
```

### Scorer — trois mesures brutes (`scorer.ts`)

**tfidfSim** : similarité cosinus entre les vecteurs TF-IDF complets de A et B (toutes dimensions confondues).

**embSim** : similarité cosinus entre les vecteurs d'embedding de A et B.

**complementarity** : mesure à quel point deux chercheurs partagent un contexte thématique large tout en ayant des spécialités fines distinctes. Elle est calculée à partir de **sous-vecteurs** extraits du vecteur TF-IDF en filtrant par préfixe de niveau. Pour chaque niveau, on calcule une **similarité cosinus normalisée** (les sous-vecteurs ne sont pas L2-normalisés globalement, on recalcule la norme localement) :

- `domainSim` : similarité cosinus sur les seules dimensions `domain::` de A et B
- `fieldSim` : similarité cosinus sur les seules dimensions `field::`
- `subfieldSim` : similarité cosinus sur les seules dimensions `subfield::`
- `topicSim` : similarité cosinus sur les seules dimensions `topic::`
- `keywordSim` : similarité cosinus sur les seules dimensions `keyword::` (si `--keywords` activé)

Ces cinq valeurs sont combinées en deux termes :

- `sharedContext` : contexte thématique partagé, pondéré par niveau. Les niveaux fins (subfield) ont un poids plus élevé que les niveaux larges (domain) car ils signalent une proximité plus significative.
- `distinctness` : divergence au niveau le plus fin (`1 − topicSim`). Elle est maximale quand les topics sont complètement différents.

```
sharedContext  = 0.2 × domainSim + 0.3 × fieldSim + 0.5 × subfieldSim
distinctness   = 1 − topicSim
complementarity = sharedContext × distinctness
```

Avec `--keywords` activé, `keywordSim` s'ajoute au `sharedContext` avec un poids de 0.1, les autres poids étant légèrement réduits :

```
sharedContext = 0.2 × domainSim + 0.25 × fieldSim + 0.45 × subfieldSim + 0.1 × keywordSim
```

Les keywords ont un poids plus faible que les niveaux taxonomiques car ils sont estimés par un modèle et leur nombre a été limité par OpenAlex, mais ils partagent la même structure (identifiant + score) — ils s'intègrent donc nativement dans le vecteur TF-IDF avec un préfixe `keyword::`.

La complémentarité ne peut pas être calculée depuis les embeddings car ceux-ci n'ont pas de structure hiérarchique exploitable.

### Ensemble — score final (`ensemble.ts`)

Le scorer produit trois scalaires indépendants. L'ensemble les assemble en un `MatchScore` :

```
similarity      = 0.5 × tfidfSim + 0.5 × embSim   (combinaison des deux signaux)
complementarity = tel quel depuis le scorer         (conservé séparé, répond à une question différente)
```

`similarity` et `complementarity` ne sont pas additionnés : l'un mesure *à quel point deux chercheurs se ressemblent*, l'autre *à quel point ils s'apportent mutuellement quelque chose de nouveau*. Les présenter ensemble dans le `MatchScore` permet au CLI de trier sur l'un ou l'autre selon le cas d'usage.

Le poids 50/50 est un choix conservateur en l'absence de données de validation. Les poids sont exposés comme paramètre (`EnsembleWeights`) pour permettre un ajustement futur sans modifier le code.
