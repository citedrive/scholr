import type { SearchApiId } from "@/shared/lib/search-databases";

export type StepStatus = "pending" | "running" | "done" | "error";

export type StepId =
  | "keywords"
  | "combine"
  | "search"
  | "collect"
  | "filter"
  | "evaluate";

export interface KeywordResult {
  term: string;
  count: number;
}

export type SearchQueryVariant = "broad" | "narrow";

export type DatabaseSearchRunPayload = {
  apiId: SearchApiId;
  queryVariant: SearchQueryVariant;
  queryUsed: string;
};

export interface SearchSource {
  name: string;
  count: number;
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  journal: string;
  relevanceScore: number;
  doi?: string;
}

/** Record from the literature index before heuristic relevance is attached. */
export type LiteratureHit = Omit<Paper, "relevanceScore">;

export interface KeywordsStepData {
  keywords: KeywordResult[];
}

export interface KeywordGroup {
  label: string;
  terms: string[];
}

export interface CombineStepData {
  groups: KeywordGroup[];
  /** Broad boolean query — OR within groups, AND across groups (maximal recall). */
  searchString: string;
  /** Narrower alternative — fewer synonyms per concept for higher precision / smaller result sets. */
  preciseSearchString: string;
}

export interface SearchStepData {
  /** Total hits reported by the index (may exceed what we fetched). */
  total: number;
  /** Number of records returned on this page. */
  hitsReturned: number;
  sources: SearchSource[];
  chosenApi: SearchApiId;
  queryVariant: SearchQueryVariant;
  /** Boolean string sent to the selected database (general or narrow). */
  queryUsed: string;
  /** Retrieved records with heuristic relevance scores for quick review. */
  papers: Paper[];
}

export interface CollectStepData {
  total: number;
  withMetadata: number;
}

export interface FilterStepData {
  before: number;
  removed: number;
  after: number;
}

export interface EvaluateStepData {
  papers: Paper[];
}

export type StepData =
  | KeywordsStepData
  | CombineStepData
  | SearchStepData
  | CollectStepData
  | FilterStepData
  | EvaluateStepData;

export interface PipelineStep {
  id: StepId;
  label: string;
  status: StepStatus;
  data?: StepData;
  /** Set when this step fails, contains the human-readable error from the service. */
  errorMessage?: string;
}

export interface ResearchSession {
  id: string;
  query: string;
  steps: PipelineStep[];
  createdAt: Date;
}
