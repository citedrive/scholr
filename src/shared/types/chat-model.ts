export const CHAT_MODEL_OPTIONS = [
  { id: "chatgpt", label: "ChatGPT" },
  { id: "ollama", label: "Ollama" },
  { id: "claude", label: "Claude" },
] as const;

export type ChatModelId = (typeof CHAT_MODEL_OPTIONS)[number]["id"];
