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

export interface KeywordsStepData {
  keywords: KeywordResult[];
}

export interface KeywordGroup {
  label: string;
  terms: string[];
}

export interface CombineStepData {
  groups: KeywordGroup[];
  searchString: string;
}

export interface SearchStepData {
  total: number;
  sources: SearchSource[];
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
