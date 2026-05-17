import type { PipelineStep } from "@/types/research";

export interface ResearchSessionJson {
  id: string;
  query: string;
  steps: PipelineStep[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  createdAt: string;
  updatedAt: string;
}
