import { invoke } from "@tauri-apps/api/core";
import type { KeywordResult } from "@/types/research";
import type { ChatModelId } from "@/components/chat/ChatInput";
import { KEYWORD_SYSTEM_PROMPT } from "@/lib/system-prompts";

/**
 * Persist an API key for the given provider in the Tauri secure store.
 * Pass an empty string to clear a previously saved key.
 */
export async function setApiKey(provider: ChatModelId, key: string): Promise<void> {
  await invoke<void>("set_api_key", { provider, key });
}

/**
 * Returns whether an API key is currently saved for the given provider.
 */
export async function hasApiKey(provider: ChatModelId): Promise<boolean> {
  return invoke<boolean>("has_api_key", { provider });
}

/**
 * Call the model service to extract keywords from the research question.
 * Returns an array of KeywordResult objects (count defaults to 0 since
 * frequency data is not available at this stage).
 *
 * Throws if the provider is unknown or the API call fails — callers should
 * catch and fall back to mock data as appropriate.
 */
export async function extractKeywords(
  query: string,
  provider: ChatModelId,
  model: string,
): Promise<KeywordResult[]> {
  const terms = await invoke<string[]>("extract_keywords", {
    query,
    provider,
    model,
    systemPrompt: KEYWORD_SYSTEM_PROMPT,
  });
  return terms.map((term) => ({ term, count: 0 }));
}
