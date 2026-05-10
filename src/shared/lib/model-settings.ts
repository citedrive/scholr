import type { ChatModelId } from "@/shared/types/chat-model";

export type ProviderModelSettings = {
  enabled: boolean;
  modelName: string;
};

export const DEFAULT_PROVIDER_SETTINGS: Record<
  ChatModelId,
  ProviderModelSettings
> = {
  chatgpt: { enabled: true, modelName: "gpt-4o" },
  ollama: { enabled: true, modelName: "llama3" },
  claude: { enabled: true, modelName: "claude-3-5-sonnet-20241022" },
};

export function enabledModelIds(
  settings: Record<ChatModelId, ProviderModelSettings>,
): ChatModelId[] {
  return (Object.entries(settings) as [ChatModelId, ProviderModelSettings][])
    .filter(([, v]) => v.enabled)
    .map(([k]) => k);
}
