type Cluster = string[];

type GroupWithScore = {
  items: Cluster;
  score: number; // between 0 and 1
};

/**
 * Calcule la distance de Levenshtein entre deux chaînes.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);

  for (let i = 1; i <= m; i++) {
    let prev = dp[0] ?? 0;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j] ?? 0;
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      dp[j] = Math.min((dp[j] ?? 0) + 1, (dp[j - 1] ?? 0) + 1, prev + cost);
      prev = temp;
    }
  }

  return dp[n] ?? 0;
}

/**
 * Similarité normalisée entre 0 et 1 (1 = identique)
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

/**
 * groupBySimilarity(strings, threshold)
 * - strings: liste d'entrées (chaînes)
 * - threshold: seuil de similarité pour mettre dans le même groupe (valeur entre 0 et 1)
 *
 * Renvoie un tableau de groupes (chaque groupe est une liste de chaînes).
 */
type CommonOptions = {
  keepDuplicates?: boolean;
  normalize?: NormalizeOptions | false;
};

function prepareItems(strings: string[], keepDuplicates: boolean): string[] {
  if (keepDuplicates) return strings.map((s) => String(s));
  const seen = new Map<string, string>();
  for (const raw of strings) {
    const s = String(raw);
    const key = s.toLowerCase();
    if (!seen.has(key)) seen.set(key, s);
  }
  return Array.from(seen.values());
}

/**
 * Generic grouping function.
 * - strings: raw input
 * - threshold: threshold for comparator
 * - comparator: function returning similarity in [0,1] for two normalized strings
 * - options.normalize: if not false, normalizeString is applied before comparator
 *
 * Returns groups of raw strings.
 */
/**
 * Internal helper: perform grouping on prepared items using indices.
 * Returns groups as arrays of indices, plus the items and normalized values.
 */
function groupByGenericIndices(
  strings: string[],
  threshold: number,
  comparator: (a: string, b: string) => number,
  options: CommonOptions = {},
): { groupsIndices: number[][]; items: string[]; norms: string[] } {
  if (!Array.isArray(strings))
    throw new TypeError("strings must be an array of strings");
  if (strings.length === 0) return { groupsIndices: [], items: [], norms: [] };

  const items = prepareItems(strings, Boolean(options.keepDuplicates));

  // Precompute normalized representations to avoid repeated work.
  const norms = items.map((it) =>
    options.normalize === false
      ? it
      : normalizeString(it, options.normalize ?? {}),
  );

  const groupsIndices: number[][] = [];

  for (let i = 0; i < items.length; i++) {
    const ai = norms[i] ?? "";
    let placed = false;
    for (const group of groupsIndices) {
      const repIndex = group[0] ?? 0;
      const bi = norms[repIndex] ?? "";
      if (comparator(ai, bi) >= threshold) {
        group.push(i);
        placed = true;
        break;
      }
    }
    if (!placed) groupsIndices.push([i]);
  }

  return { groupsIndices, items, norms };
}

function groupByGeneric(
  strings: string[],
  threshold: number,
  comparator: (a: string, b: string) => number,
  options: CommonOptions = {},
): Cluster[] {
  const { groupsIndices, items } = groupByGenericIndices(
    strings,
    threshold,
    comparator,
    options,
  );
  return groupsIndices.map((indices) => indices.map((i) => items[i] ?? ""));
}

function groupBySimilarity(
  strings: string[],
  threshold = 0.75,
  options: CommonOptions = {},
): Cluster[] {
  return groupByGeneric(strings, threshold, similarity, options);
}

/**
 * Variante qui retourne les groupes avec un score de similarité.
 * Le score est la moyenne des similarités de chaque élément du groupe
 * par rapport au représentant (premier élément) du groupe.
 */
function groupBySimilarityWithScore(
  strings: string[],
  threshold = 0.75,
  options: CommonOptions = {},
): GroupWithScore[] {
  const { groupsIndices, items, norms } = groupByGenericIndices(
    strings,
    threshold,
    similarity,
    options,
  );
  return groupsIndices.map((indices) => {
    const repIndex = indices[0] ?? 0;
    const repNorm = norms[repIndex] ?? "";
    const sum = indices.reduce(
      (acc, idx) => acc + similarity(norms[idx] ?? "", repNorm),
      0,
    );
    const score = indices.length === 0 ? 0 : sum / indices.length;
    return { items: indices.map((i) => items[i] ?? ""), score };
  });
}

/**
 * Retourne l'ensemble des n-grams d'une chaîne (sliding window), en minuscules.
 */
function ngramsOf(s: string, n: number): Set<string> {
  const out = new Set<string>();
  const str = s.toLowerCase();
  if (n <= 0) return out;
  for (let i = 0; i + n <= str.length; i++) {
    out.add(str.slice(i, i + n));
  }
  return out;
}

/**
 * Jaccard similarity between two sets.
 */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Compute n-gram similarity using multiple n values and optional weights.
 * Returns a value in [0,1].
 */
function ngramSimilarity(
  a: string,
  b: string,
  nValues: number[] = [2, 3],
  weights?: number[],
): number {
  if (a === b) return 1;
  const norms = nValues.map((n) => {
    const sa = ngramsOf(a, n);
    const sb = ngramsOf(b, n);
    return jaccard(sa, sb);
  });
  if (weights && weights.length === norms.length) {
    const totalW = weights.reduce((s, w) => s + w, 0) || 1;
    return norms.reduce(
      (acc, v, i) => acc + v * ((weights[i] ?? 0) / totalW),
      0,
    );
  }
  // simple average
  return norms.reduce((s, v) => s + v, 0) / norms.length;
}

/**
 * Normalise une chaîne : options communes
 * - removeDiacritics: retire les accents
 * - removePunctuation: supprime la ponctuation
 * - collapseWhitespace: remplace les suites d'espaces par un seul espace et trim
 * - lower: met en minuscules
 */
type NormalizeOptions = {
  removeDiacritics?: boolean;
  removePunctuation?: boolean;
  collapseWhitespace?: boolean;
  lower?: boolean;
};

function normalizeString(
  input: string,
  options: NormalizeOptions = {},
): string {
  const {
    removeDiacritics = true,
    removePunctuation = true,
    collapseWhitespace = true,
    lower = true,
  } = options;

  let s = String(input);

  if (removeDiacritics) {
    // NFD then remove combining marks
    s = s.normalize("NFD").replace(/\p{M}/gu, "");
  }

  if (removePunctuation) {
    // keep letters, numbers, spaces and hyphen/underscore
    s = s.replace(/[^\p{L}\p{N}\s_-]/gu, "");
  }

  if (collapseWhitespace) {
    s = s.replace(/\s+/g, " ").trim();
  }

  if (lower) s = s.toLowerCase();

  return s;
}

export {};

/**
 * Regroupe par similarité basée sur n-grams (Jaccard) — supporte bi-gram et tri-gram.
 * options: { keepDuplicates?: boolean, nValues?: number[], weights?: number[] }
 */
function groupByNGramSimilarity(
  strings: string[],
  threshold = 0.5,
  options: {
    keepDuplicates?: boolean;
    nValues?: number[];
    weights?: number[];
    normalize?: NormalizeOptions | false;
  } = {},
): Cluster[] {
  const nValues =
    Array.isArray(options.nValues) && options.nValues.length > 0
      ? options.nValues
      : [2, 3];
  const weights = options.weights;
  const comparator = (a: string, b: string) =>
    ngramSimilarity(a, b, nValues, weights);
  return groupByGeneric(strings, threshold, comparator, options);
}

export {
  groupBySimilarity,
  groupBySimilarityWithScore,
  groupByNGramSimilarity,
  normalizeString,
  type Cluster,
  type GroupWithScore,
};
