import type { WorksResult } from "@univ-lehavre/atlas-citation-types";
import type { ResearcherData } from "../types.js";

const MIN_TOPIC_SCORE = 0.3;

export interface NormalizedTopic {
  topicId: string;
  topicLabel: string;
  subfieldId: string;
  subfieldLabel: string;
  fieldId: string;
  fieldLabel: string;
  domainId: string;
  domainLabel: string;
  score: number;
}

export interface NormalizedKeyword {
  keywordId: string;
  keywordLabel: string;
  score: number;
}

export interface NormalizedWork {
  topics: NormalizedTopic[];
  keywords: NormalizedKeyword[];
}

export function extractNormalizedWorks(data: ResearcherData): NormalizedWork[] {
  return data.final_references.map((work: WorksResult) => ({
    topics: (work.topics ?? [])
      .filter((t) => t.score >= MIN_TOPIC_SCORE)
      .map((t) => ({
        topicId: t.id,
        topicLabel: t.display_name,
        subfieldId: t.subfield.id,
        subfieldLabel: t.subfield.display_name,
        fieldId: t.field.id,
        fieldLabel: t.field.display_name,
        domainId: t.domain.id,
        domainLabel: t.domain.display_name,
        score: t.score,
      })),
    keywords: (work.keywords ?? []).map((k) => ({
      keywordId: k.id,
      keywordLabel: k.display_name,
      score: k.score,
    })),
  }));
}
