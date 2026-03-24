/**
 * Helpers internes pour le module `group`.
 * Ces fonctions sont exportées depuis ce fichier pour pouvoir être testées
 * isolément sans polluer l'API publique principale.
 */

export type NormalizeOptions = {
  removeDiacritics?: boolean;
  removePunctuation?: boolean;
  collapseWhitespace?: boolean;
  lower?: boolean;
};

export type CommonOptions = {
  keepDuplicates?: boolean;
  normalize?: NormalizeOptions | false;
};

export function levenshtein(a: string, b: string): number {
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

export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

export function prepareItems(
  strings: string[],
  keepDuplicates: boolean,
): string[] {
  if (keepDuplicates) return strings.map((s) => String(s));
  const seen = new Map<string, string>();
  for (const raw of strings) {
    const s = String(raw);
    const key = s.toLowerCase();
    if (!seen.has(key)) seen.set(key, s);
  }
  return Array.from(seen.values());
}

export function groupByGenericIndices(
  strings: string[],
  threshold: number,
  comparator: (a: string, b: string) => number,
  options: CommonOptions = {},
): { groupsIndices: number[][]; items: string[]; norms: string[] } {
  if (!Array.isArray(strings))
    throw new TypeError("strings must be an array of strings");
  if (strings.length === 0) return { groupsIndices: [], items: [], norms: [] };

  const items = prepareItems(strings, Boolean(options.keepDuplicates));
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

export function groupByGeneric(
  strings: string[],
  threshold: number,
  comparator: (a: string, b: string) => number,
  options: CommonOptions = {},
): string[][] {
  const { groupsIndices, items } = groupByGenericIndices(
    strings,
    threshold,
    comparator,
    options,
  );
  return groupsIndices.map((indices) => indices.map((i) => items[i] ?? ""));
}

export function ngramsOf(s: string, n: number): Set<string> {
  const out = new Set<string>();
  const str = s.toLowerCase();
  if (n <= 0) return out;
  for (let i = 0; i + n <= str.length; i++) {
    out.add(str.slice(i, i + n));
  }
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function ngramSimilarity(
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
  return norms.reduce((s, v) => s + v, 0) / norms.length;
}

export function normalizeString(
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

  if (removeDiacritics) s = s.normalize("NFD").replace(/\p{M}/gu, "");
  if (removePunctuation) s = s.replace(/[^\p{L}\p{N}\s_-]/gu, "");
  if (collapseWhitespace) s = s.replace(/\s+/g, " ").trim();
  if (lower) s = s.toLowerCase();

  return s;
}
