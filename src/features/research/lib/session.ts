import type {
  ResearchSession,
  PipelineStep,
  CollectStepData,
  FilterStepData,
  EvaluateStepData,
} from "@/types/research";

const HEURISTIC_ABSTRACT_REJECT_SHARE = 412 / 2_893;

export function createSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function generateTailStepData(
  reportedCorpusTotal: number,
  scoredPapers: EvaluateStepData["papers"],
): {
  collect: CollectStepData;
  filter: FilterStepData;
  evaluate: EvaluateStepData;
} {
  const fetched = scoredPapers.length;

  if (fetched === 0) {
    return {
      collect: {
        total: reportedCorpusTotal,
        withMetadata: 0,
      },
      filter: { before: 0, removed: 0, after: 0 },
      evaluate: { papers: [] },
    };
  }

  const metaGap = Math.max(0, Math.round(fetched * 0.06));
  const withMetadata = Math.max(1, fetched - metaGap);
  const before = withMetadata;
  const removed = Math.min(
    Math.round(before * HEURISTIC_ABSTRACT_REJECT_SHARE),
    Math.max(0, before - 1),
  );
  const after = Math.max(0, before - removed);
  const kept = scoredPapers.slice(0, after);

  return {
    collect: {
      total: fetched,
      withMetadata,
    },
    filter: { before, removed, after },
    evaluate: { papers: kept },
  };
}

export function createEmptySession(id: string, query: string): ResearchSession {
  const STEP_LABELS: PipelineStep[] = [
    { id: "keywords", label: "Keyword analysis", status: "pending" },
    { id: "combine", label: "Query construction", status: "pending" },
    { id: "search", label: "Database search", status: "pending" },
    { id: "collect", label: "Paper collection", status: "pending" },
    { id: "filter", label: "Abstract filter", status: "pending" },
    { id: "evaluate", label: "Relevance scoring", status: "pending" },
  ];
  return { id, query, createdAt: new Date(), steps: STEP_LABELS };
}
