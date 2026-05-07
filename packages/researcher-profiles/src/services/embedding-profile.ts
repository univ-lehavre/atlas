import type { NormalizedWork } from "./topic-extractor.js";

export interface EmbeddingProfile {
  readonly researcherId: string;
  readonly vector: Float32Array;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- @xenova/transformers has no types
type Pipeline = (text: string, opts: Record<string, unknown>) => Promise<any>;

let pipelineInstance: Pipeline | null = null;

const getPipeline = async (): Promise<Pipeline> => {
  if (pipelineInstance !== null) return pipelineInstance;
  const { pipeline } = await import("@xenova/transformers");
  const instance = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
  );
  pipelineInstance = instance as Pipeline;
  return pipelineInstance;
};

const workToText = (work: NormalizedWork): string =>
  [
    ...work.topics.map((t) => t.topicLabel),
    ...work.keywords.map((k) => k.keywordLabel),
  ].join(", ");

const meanPool = (vectors: Float32Array[]): Float32Array => {
  const dim = vectors[0]!.length;
  const sums = Array.from<number>({ length: dim }).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      sums[i]! += v[i]!;
    }
  }
  return new Float32Array(sums.map((x) => x / vectors.length));
};

const l2Normalize = (v: Float32Array): Float32Array => {
  const norm = Math.sqrt([...v].reduce((s, x) => s + x * x, 0));
  return v.map((x) => x / norm);
};

export const buildEmbeddingProfiles = async (
  researchers: { id: string; works: NormalizedWork[] }[],
  onProgress?: (done: number, total: number) => void,
): Promise<EmbeddingProfile[]> => {
  const extractor = await getPipeline();
  const profiles: EmbeddingProfile[] = [];

  for (let i = 0; i < researchers.length; i++) {
    const { id, works } = researchers[i]!;
    const texts = works.map(workToText).filter((t) => t.length > 0);

    let vector: Float32Array;
    if (texts.length === 0) {
      vector = new Float32Array(384);
    } else {
      const vecs: Float32Array[] = [];
      for (const text of texts) {
        const output = await extractor(text, {
          pooling: "mean",
          normalize: false,
        });
        vecs.push(new Float32Array(output.data));
      }
      vector = l2Normalize(meanPool(vecs));
    }

    onProgress?.(i + 1, researchers.length);
    profiles.push({ researcherId: id, vector });
  }

  return profiles;
};
