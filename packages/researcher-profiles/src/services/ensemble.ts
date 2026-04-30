export interface MatchScore {
  readonly similarity: number;
  readonly complementarity: number;
  readonly tfidfSim: number;
  readonly embeddingSim: number;
}

export interface EnsembleWeights {
  tfidf: number;
  embedding: number;
}

const DEFAULT_WEIGHTS: EnsembleWeights = { tfidf: 0.5, embedding: 0.5 };

export function computeEnsembleMatch(
  tfidfSim: number,
  embeddingSim: number,
  complementarity: number,
  weights: EnsembleWeights = DEFAULT_WEIGHTS,
): MatchScore {
  const similarity =
    weights.tfidf * tfidfSim + weights.embedding * embeddingSim;
  return { similarity, complementarity, tfidfSim, embeddingSim };
}
