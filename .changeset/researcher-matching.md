---
"@univ-lehavre/atlas-researcher-profiles": minor
"@univ-lehavre/atlas-researcher-profiles-cli": minor
"@univ-lehavre/atlas-openalex-types": patch
---

Add researcher matching command (`match-researchers`)

Computes pairwise similarity and complementarity between researchers using an ensemble of TF-IDF weighted topic vectors (OpenAlex taxonomy) and semantic embeddings (`all-MiniLM-L6-v2`).

- `similarity`: 50% TF-IDF cosine + 50% embedding cosine
- `complementarity`: shared context (domain/field/subfield) × (1 − topic overlap)
- Output: ranked table or JSON; optional interactive SVG scatter plot (`--chart`)
- `--keywords` flag includes OpenAlex keyword vectors in both scoring and explanation
- `--sort-by similarity|complementarity` controls ranking
