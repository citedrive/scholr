import { invoke } from "@tauri-apps/api/core";
import type { SearchHistoryItem } from "@/types/vault";
import type { ResearchSession } from "@/types/research";
import { parseSessionJson, serializeSession } from "@/features/vault/lib/serialize";

export async function getVaultPath(): Promise<string | null> {
  return invoke<string | null>("get_vault_path");
}

export async function setVaultPath(path: string): Promise<void> {
  await invoke("set_vault_path", { path });
}

export async function pickVaultFolder(): Promise<string> {
  return invoke<string>("pick_vault_folder");
}

export async function listSessions(): Promise<SearchHistoryItem[]> {
  return invoke<SearchHistoryItem[]>("list_sessions");
}

export async function saveSession(session: ResearchSession): Promise<void> {
  await invoke("save_session", {
    sessionId: session.id,
    sessionJson: serializeSession(session),
  });
}

export async function loadSession(sessionId: string): Promise<ResearchSession> {
  const raw = await invoke<string>("load_session", { sessionId });
  return parseSessionJson(raw);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await invoke("delete_session", { sessionId });
}
