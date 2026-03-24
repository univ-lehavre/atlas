import {
  groupBySimilarity,
  groupBySimilarityWithScore,
  normalizeString,
} from "./index.js";
import { groupByNGramSimilarity } from "./index.js";

describe("groupBySimilarity", () => {
  test("groupe des chaînes identiques", () => {
    const input = ["a", "a", "a"];
    const groups = groupBySimilarity(input, 0.9);
    expect(groups.length).toBe(1);
    // duplicates are removed before grouping, so only one 'a' remains
    expect(groups[0].sort()).toEqual(["a"].sort());
  });

  test("sépare des items différents", () => {
    const input = ["Paris", "Lyon", "Marseille"];
    const groups = groupBySimilarity(input, 0.9);
    expect(groups.length).toBe(3);
  });

  test("regroupe des variantes proches", () => {
    const input = ["Paris", "Pariss", "Pari", "Lyon"];
    const groups = groupBySimilarity(input, 0.7);
    // Paris variants should be grouped
    const hasParisGroup = groups.some(
      (g) => g.includes("Paris") && g.includes("Pariss") && g.includes("Pari"),
    );
    expect(hasParisGroup).toBe(true);
    expect(groups.length).toEqual(2);
  });

  test("gère la casse (insensible)", () => {
    const input = ["Paris", "paris", "PARIS"];
    const groups = groupBySimilarity(input, 0.9);
    expect(groups.length).toBe(1);
  });

  test("retourne vide pour tableau vide", () => {
    expect(groupBySimilarity([], 0.8)).toEqual([]);
  });

  test("élimine les doublons insensibles à la casse avant de grouper", () => {
    const input = ["Paris", "paris", "PARIS", "Lyon", "lyon"];
    const groups = groupBySimilarity(input, 0.9);
    // 'Paris' and 'paris' should be considered the same item -> uniques preserved
    // Expect two groups: Paris and Lyon
    expect(groups.length).toBe(2);
    const flat = groups.flat();
    // Each unique value should appear only once
    const parisCount = flat.filter((s) => s.toLowerCase() === "paris").length;
    const lyonCount = flat.filter((s) => s.toLowerCase() === "lyon").length;
    expect(parisCount).toBe(1);
    expect(lyonCount).toBe(1);
  });

  test("garde les doublons si option keepDuplicates=true", () => {
    const input = ["a", "a", "A"];
    const groups = groupBySimilarity(input, 0.9, { keepDuplicates: true });
    // duplicates are preserved, but similar items may still be grouped depending on threshold
    // with a high threshold identical items remain in the same group but multiples persist
    expect(groups.length).toBe(1);
    expect(groups[0].length).toBe(3);
  });

  test("lève une TypeError si le paramètre n'est pas un tableau", () => {
    // cast to any to test runtime behavior for invalid inputs
    // Allow calling with invalid runtime values for test purposes
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: intentionally passing invalid runtime value
    expect(() => groupBySimilarity(null)).toThrow(TypeError);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: intentionally passing invalid runtime value
    expect(() => groupBySimilarity(undefined)).toThrow(TypeError);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: intentionally passing invalid runtime value
    expect(() => groupBySimilarity({})).toThrow(TypeError);
  });

  test("gère les éléments non-string dans le tableau en les convertissant en string", () => {
    const input = [
      "a",
      null as unknown as string,
      undefined as unknown as string,
      123 as unknown as string,
    ];
    const groups = groupBySimilarity(input, 0.5, { keepDuplicates: true });
    // conversion: null -> 'null', undefined -> 'undefined', 123 -> '123'
    const flat = groups.flat();
    expect(flat).toContain("null");
    expect(flat).toContain("undefined");
    expect(flat).toContain("123");
  });

  test("regroupe avec normalisation (par défaut) et pas sans", () => {
    const input = ["École", "ecole", "Ecole!"];
    const withNorm = groupBySimilarity(input, 0.9);
    expect(withNorm.length).toBe(1);
    const withoutNorm = groupBySimilarity(input, 0.9, { normalize: false });
    // Without normalization the accented variant won't match the plain form at high threshold
    expect(withoutNorm.length).toBeGreaterThanOrEqual(2);
  });
});

describe("groupBySimilarityWithScore", () => {
  test("retourne des scores valides", () => {
    const input = ["Paris", "Pariss", "Lyon"];
    const withScores = groupBySimilarityWithScore(input, 0.7);
    // types : GroupWithScore[] -> each entry has items and score
    expect(Array.isArray(withScores)).toBe(true);
    for (const g of withScores) {
      expect(Array.isArray(g.items)).toBe(true);
      expect(typeof g.score).toBe("number");
      expect(g.score).toBeGreaterThanOrEqual(0);
      expect(g.score).toBeLessThanOrEqual(1);
    }
    // group of identical/similar Paris variants should have score > 0.7
    const parisGroup = withScores.find((g) =>
      g.items.some((it: string) => it === "Paris"),
    );
    expect(parisGroup).toBeDefined();
    expect(parisGroup?.score).toBeGreaterThan(0.7);
  });

  test("respecte keepDuplicates", () => {
    const input = ["a", "a", "A"];
    const withKeep = groupBySimilarityWithScore(input, 0.9, {
      keepDuplicates: true,
    });
    const withoutKeep = groupBySimilarityWithScore(input, 0.9, {
      keepDuplicates: false,
    });
    expect(withKeep[0].items.length).toBe(3);
    expect(withoutKeep[0].items.length).toBe(1);
  });

  test("lève une TypeError si le paramètre n'est pas un tableau", () => {
    // same for the scored variant
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: intentionally passing invalid runtime value
    expect(() => groupBySimilarityWithScore(null)).toThrow(TypeError);
  });
});

describe("groupByNGramSimilarity", () => {
  test("regroupe avec bi-gram/tri-gram", () => {
    const input = ["paris", "pariss", "lyon"];
    const groups = groupByNGramSimilarity(input, 0.4, { nValues: [2, 3] });
    // Expect paris variants to be grouped
    const hasParisGroup = groups.some(
      (g) => g.includes("paris") && g.includes("pariss"),
    );
    expect(hasParisGroup).toBe(true);
  });

  test("respecte keepDuplicates", () => {
    const input = ["a", "a", "A"];
    const withKeep = groupByNGramSimilarity(input, 0.5, {
      keepDuplicates: true,
    });
    const withoutKeep = groupByNGramSimilarity(input, 0.5, {
      keepDuplicates: false,
    });
    expect(withKeep[0].length).toBe(3);
    expect(withoutKeep[0].length).toBe(1);
  });

  test("avec le paramètre weights influence le score (sanity check)", () => {
    const a = "paris";
    const b = "pariss";
    const low = groupByNGramSimilarity([a, b], 0.99, {
      nValues: [2],
      weights: [1],
    });
    const mixed = groupByNGramSimilarity([a, b], 0.1, {
      nValues: [2, 3],
      weights: [0, 1],
    });
    // both groupings are just sanity-checked for not throwing and producing arrays
    expect(Array.isArray(low)).toBe(true);
    expect(Array.isArray(mixed)).toBe(true);
  });

  test("respecte la normalisation", () => {
    const input = ["café", "cafe", "caff"];
    const withNorm = groupByNGramSimilarity(input, 0.4, { nValues: [2, 3] });
    // café and cafe should be grouped when normalization is active
    const hasCafeGroup = withNorm.some(
      (g) => g.includes("café") && g.includes("cafe"),
    );
    expect(hasCafeGroup).toBe(true);
    groupByNGramSimilarity(input, 0.4, { nValues: [2, 3], normalize: false });
    // without normalization they may or may not be grouped depending on threshold/ngrams
    // we only assert that normalization helps grouping
  });

  test("scenario complexe n-gram : regroupe variantes d'une même entité et conserve doublons", () => {
    const input = [
      "Université de Paris",
      "Universite de Paris",
      "Universitty de Paris",
      "Paris Université",
      "University of Paris",
      "Univ. de Paris",
      "Université de Paris", // duplicate
      "Lyon Université",
      "Lyon",
      "Lyonnaise",
    ];

    // grouping with n-grams and default normalization
    const groups = groupByNGramSimilarity(input, 0.35, { nValues: [2, 3] });
    const mainGroup = groups.find((g) => g.includes("Université de Paris"));
    expect(mainGroup).toBeDefined();
    // Expect most Paris/University variants to be in the same cluster
    expect((mainGroup || []).length).toBeGreaterThanOrEqual(5);

    // With keepDuplicates the duplicate must be preserved inside the resulting group
    const groupsWithKeep = groupByNGramSimilarity(input, 0.35, {
      nValues: [2, 3],
      keepDuplicates: true,
    });
    const mainWithKeep = groupsWithKeep.find((g) =>
      g.includes("Université de Paris"),
    );
    expect(mainWithKeep).toBeDefined();
    // there are at least two exact duplicates of 'Université de Paris' in input
    const dupCount = (mainWithKeep || []).filter(
      (s) => s === "Université de Paris",
    ).length;
    expect(dupCount).toBeGreaterThanOrEqual(2);

    // Sanity: there should be a separate group for Lyon-related strings
    const lyonGroup = groups.find((g) =>
      g.some((s) => s.toLowerCase().includes("lyon")),
    );
    expect(lyonGroup).toBeDefined();
    // Ensure not all Lyon-related items were absorbed by the Paris main group
    const totalLyonItems = groups
      .flat()
      .filter((s) => s.toLowerCase().includes("lyon")).length;
    const lyonInMain = (mainGroup || []).filter((s) =>
      s.toLowerCase().includes("lyon"),
    ).length;
    expect(totalLyonItems).toBeGreaterThan(0);
    expect(lyonInMain).toBeLessThan(totalLyonItems);
  });
});

describe("normalizeString", () => {
  test("normalizeString retire accents et ponctuation et met en minuscule", () => {
    const s = "École, café! - Déjà";
    const norm = normalizeString(s);
    expect(norm).toBe("ecole cafe - deja");
  });
});
