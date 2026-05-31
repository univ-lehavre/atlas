import { writeFileSync } from "node:fs";
import path from "node:path";
import { spinner, log, outro } from "@clack/prompts";
import pc from "picocolors";
import { Effect, Either } from "effect";
import {
  fetchResearchers,
  fetchResearcherData,
  extractNormalizedWorks,
  buildTfidfProfiles,
  buildEmbeddingProfiles,
  cosineSimilarity,
  embeddingCosineSimilarity,
  complementarityScore,
  computeEnsembleMatch,
  buildExplanation,
  buildMatch,
  sortByField,
  type ResearcherMatch,
  type ResearcherData,
} from "@univ-lehavre/atlas-researcher-profiles";
import { generateChart } from "../output/chart.js";

export interface MatchResearchersOptions {
  readonly crfUrl: string;
  readonly crfToken: string;
  readonly top?: number;
  readonly output: "table" | "json";
  readonly sortBy: "similarity" | "complementarity";
  readonly keywords: boolean;
  readonly chart: boolean;
}

const CONCURRENCY = 4;

async function fetchAllData(
  config: { url: string; token: string },
  userids: string[],
  onProgress: (done: number, total: number) => void,
): Promise<{ userid: string; data: ResearcherData | null }[]> {
  const results: { userid: string; data: ResearcherData | null }[] = [];
  let done = 0;

  for (let i = 0; i < userids.length; i += CONCURRENCY) {
    const batch = userids.slice(i, i + CONCURRENCY);
    const fetched = await Promise.all(
      batch.map(async (userid) => {
        const result = await Effect.runPromise(
          Effect.either(fetchResearcherData(config, userid)),
        );
        done++;
        onProgress(done, userids.length);
        if (Either.isLeft(result)) return { userid, data: null };
        return { userid, data: result.right };
      }),
    );
    results.push(...fetched);
  }

  return results;
}

function printTable(matches: ResearcherMatch[], top: number): void {
  const shown = matches.slice(0, top);
  log.message(
    pc.bold(`Top ${String(shown.length)} matches`) +
      pc.dim(` (sorted by ${matches === shown ? "similarity" : "score"})`),
  );
  for (const [i, m] of shown.entries()) {
    const nameA = m.researcherA.name;
    const nameB = m.researcherB.name;
    const sim = (m.scores.similarity * 100).toFixed(1);
    const compl = (m.scores.complementarity * 100).toFixed(1);
    const tfidf = (m.scores.tfidfSim * 100).toFixed(1);
    const emb = (m.scores.embeddingSim * 100).toFixed(1);

    log.message(
      `${pc.bold(String(i + 1))}. ${pc.cyan(nameA)} ↔ ${pc.cyan(nameB)}\n` +
        `   Similarity ${pc.green(sim + "%")} (TF-IDF ${tfidf}% · Embedding ${emb}%) · Complementarity ${pc.yellow(compl + "%")}\n` +
        (m.explanation.sharedDomains.length > 0
          ? `   Domains:   ${m.explanation.sharedDomains.slice(0, 3).join(", ")}\n`
          : "") +
        (m.explanation.sharedFields.length > 0
          ? `   Fields:    ${m.explanation.sharedFields.slice(0, 3).join(", ")}\n`
          : "") +
        (m.explanation.sharedSubfields.length > 0
          ? `   Subfields: ${m.explanation.sharedSubfields.slice(0, 3).join(", ")}\n`
          : "") +
        (m.explanation.distinctTopicsA.length > 0
          ? `   Topics (${nameA}): ${m.explanation.distinctTopicsA.slice(0, 3).join(", ")}\n`
          : "") +
        (m.explanation.distinctTopicsB.length > 0
          ? `   Topics (${nameB}): ${m.explanation.distinctTopicsB.slice(0, 3).join(", ")}\n`
          : ""),
    );
  }
}

export const matchResearchers = async (
  opts: MatchResearchersOptions,
): Promise<void> => {
  const crfConfig = { url: opts.crfUrl, token: opts.crfToken };
  const top = opts.top ?? 20;

  // 1. Fetch researcher list
  const s = spinner();
  s.start("Fetching researchers from REDCap…");

  const fetchResult = await Effect.runPromise(
    Effect.either(fetchResearchers(crfConfig)),
  );

  if (Either.isLeft(fetchResult)) {
    s.stop(pc.red("Failed to fetch researchers from REDCap"));
    log.error(JSON.stringify(fetchResult.left, null, 2));
    process.exit(1);
  }

  const researchers = fetchResult.right;
  s.stop(`Found ${pc.bold(String(researchers.length))} researchers`);

  if (researchers.length < 2) {
    outro("Not enough researchers to compute matches");
    return;
  }

  // 2. Fetch oa_data for each researcher
  const s2 = spinner();
  s2.start(`Fetching oa_data (0/${String(researchers.length)})…`);

  const rawData = await fetchAllData(
    crfConfig,
    researchers.map((r) => r.userid),
    (done, total) =>
      s2.message(`Fetching oa_data (${String(done)}/${String(total)})…`),
  );

  s2.stop(`Loaded oa_data for ${pc.bold(String(rawData.length))} researchers`);

  // 3. Extract normalized works
  const corpus = rawData
    .map(({ userid, data }) => {
      if (data === null) return null;
      const researcher = researchers.find((r) => r.userid === userid);
      if (researcher === undefined) return null;
      const works = extractNormalizedWorks(data);
      if (works.length === 0) return null;
      return {
        id: userid,
        name: `${researcher.first_name} ${researcher.last_name}`,
        works,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const skipped = researchers.length - corpus.length;
  if (skipped > 0) {
    log.warn(
      `${String(skipped)} researcher(s) excluded (no validated works with topics)`,
    );
  }

  if (corpus.length < 2) {
    outro("Not enough researchers with topic data to compute matches");
    return;
  }

  // 4. Build TF-IDF profiles
  const tfidfProfiles = buildTfidfProfiles(corpus, {
    includeKeywords: opts.keywords,
  });

  // 5. Build embedding profiles
  const s3 = spinner();
  s3.start("Building semantic embeddings (first run downloads ~23 MB model)…");

  const embeddingProfiles = await buildEmbeddingProfiles(
    corpus,
    (done, total) =>
      s3.message(`Building embeddings (${String(done)}/${String(total)})…`),
  );

  s3.stop(
    `Embeddings built for ${pc.bold(String(embeddingProfiles.length))} researchers`,
  );

  // 6. Pairwise scoring
  const matches: ResearcherMatch[] = corpus.flatMap((entryA, i) =>
    corpus.slice(i + 1).map((entryB, offset) => {
      const j = i + 1 + offset;
      /* eslint-disable security/detect-object-injection -- index numériques bornés par la taille du corpus */
      const tfidfA = tfidfProfiles[i];
      const tfidfB = tfidfProfiles[j];
      const embA = embeddingProfiles[i];
      const embB = embeddingProfiles[j];
      /* eslint-enable security/detect-object-injection -- fin du bloc de score pairwise */

      if (
        tfidfA === undefined ||
        tfidfB === undefined ||
        embA === undefined ||
        embB === undefined
      ) {
        throw new Error(`Missing profile at index ${i} or ${j}`);
      }

      const tfidfSim = cosineSimilarity(tfidfA.vector, tfidfB.vector);
      const embSim = embeddingCosineSimilarity(embA.vector, embB.vector);
      const compl = complementarityScore(tfidfA, tfidfB, {
        includeKeywords: opts.keywords,
      });
      const scores = computeEnsembleMatch(tfidfSim, embSim, compl);
      const explanation = buildExplanation(tfidfA, tfidfB);

      return buildMatch(
        { id: entryA.id, name: entryA.name },
        { id: entryB.id, name: entryB.name },
        scores,
        explanation,
      );
    }),
  );

  // 7. Sort and output
  const sorted = sortByField(matches, opts.sortBy);

  if (opts.output === "json") {
    console.log(JSON.stringify(sorted.slice(0, top), null, 2));
  } else {
    printTable(sorted, top);
  }

  if (opts.chart) {
    const html = generateChart(sorted);
    const outPath = path.resolve("matches.html");
    writeFileSync(outPath, html, "utf8");
    log.success(`Chart written to ${pc.bold(outPath)}`);
  }

  outro(
    `${String(sorted.length)} pairs computed · showing top ${String(Math.min(top, sorted.length))}`,
  );
};
