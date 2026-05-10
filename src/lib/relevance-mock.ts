import type { Paper } from "@/types/research";

function stableHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type LiteratureHit = Omit<Paper, "relevanceScore">;

/**
 * Stable pseudo relevance scores — only for UI until a real scorer exists.
 */
export function assignMockRelevanceScores(hits: LiteratureHit[]): Paper[] {
  return hits.map((paper, rank) => {
    const jitter = stableHash(`${paper.id}\0${paper.title}`) % 11;
    const score = Math.max(
      38,
      Math.min(96, 91 - rank * 2 - jitter),
    );
    return { ...paper, relevanceScore: score };
  });
}
