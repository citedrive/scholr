import { invoke } from "@tauri-apps/api/core";
import type { SearchApiId } from "@/lib/search-databases";
import type { LiteratureHit } from "@/lib/relevance-mock";

export interface LiteratureSearchDto {
  total: number;
  returned: number;
  papers: LiteratureHit[];
}

/**
 * Run a live search against the selected literature index (Tauri backend).
 */
export async function searchLiterature(
  apiId: SearchApiId,
  query: string,
): Promise<LiteratureSearchDto> {
  return invoke<LiteratureSearchDto>("search_literature", {
    apiId,
    query,
  });
}
