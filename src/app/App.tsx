import { useCallback, useEffect, useMemo, useState } from "react";
import type { ResearchSession, DatabaseSearchRunPayload } from "@/types/research";
import type { SearchHistoryItem } from "@/types/vault";
import {
  createEmptySession,
  createSessionId,
} from "@/features/research/lib/session";
import { Sidebar } from "@/features/layout/components/Sidebar";
import {
  CHAT_MODEL_OPTIONS,
  type ChatModelId,
} from "@/shared/types/chat-model";
import { ChatArea } from "@/features/chat/components/ChatArea";
import { ExportSidebar } from "@/features/export/components/ExportSidebar";
import { SettingsDialog } from "@/features/settings/components/SettingsDialog";
import { VaultSetupScreen } from "@/features/vault/components/VaultSetupScreen";
import {
  useVaultSync,
  saveSessionNow,
} from "@/features/vault/hooks/useVaultSync";
import {
  DEFAULT_PROVIDER_SETTINGS,
  enabledModelIds,
  type ProviderModelSettings,
} from "@/shared/lib/model-settings";
import {
  runPipeline,
  runDatabaseSearchAndPipelineTail,
} from "@/features/research/lib/pipeline";
import {
  getVaultPath,
  listSessions,
  loadSession,
  deleteSession,
  pickVaultFolder,
} from "@/shared/lib/vault-service";
import { toSessionJson } from "@/features/vault/lib/serialize";

function historyItemFromSession(session: ResearchSession): SearchHistoryItem {
  const json = toSessionJson(session);
  return {
    id: json.id,
    query: json.query,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
}

function upsertHistoryItem(
  items: SearchHistoryItem[],
  entry: SearchHistoryItem,
): SearchHistoryItem[] {
  const without = items.filter((i) => i.id !== entry.id);
  return [entry, ...without].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

function App() {
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [vaultReady, setVaultReady] = useState(false);
  const [vaultSetupOpen, setVaultSetupOpen] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [chatModel, setChatModel] = useState<ChatModelId>(
    CHAT_MODEL_OPTIONS[0].id,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providerSettings, setProviderSettings] = useState<
    Record<ChatModelId, ProviderModelSettings>
  >(() => ({ ...DEFAULT_PROVIDER_SETTINGS }));

  const enabledIds = useMemo(
    () => enabledModelIds(providerSettings),
    [providerSettings],
  );

  const refreshHistory = useCallback(async () => {
    try {
      const items = await listSessions();
      setHistoryItems(items);
      setVaultError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setVaultError(message);
      setVaultSetupOpen(true);
    }
  }, []);

  const handleVaultReady = useCallback(
    async (path: string) => {
      setVaultPath(path);
      setVaultReady(true);
      setVaultSetupOpen(false);
      setVaultError(null);
      await refreshHistory();
    },
    [refreshHistory],
  );

  useEffect(() => {
    void (async () => {
      try {
        const path = await getVaultPath();
        if (path) {
          await handleVaultReady(path);
        } else {
          setVaultSetupOpen(true);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setVaultError(message);
        setVaultSetupOpen(true);
      }
    })();
  }, [handleVaultReady]);

  const handleVaultSaved = useCallback((saved: ResearchSession) => {
    setHistoryItems((prev) =>
      upsertHistoryItem(prev, historyItemFromSession(saved)),
    );
  }, []);

  const handleVaultSyncError = useCallback((message: string) => {
    setVaultError(message);
    setVaultSetupOpen(true);
  }, []);

  useVaultSync({
    session,
    vaultReady,
    onSaved: handleVaultSaved,
    onError: handleVaultSyncError,
  });

  useEffect(() => {
    if (enabledIds.length === 0) return;
    if (!enabledIds.includes(chatModel)) {
      setChatModel(enabledIds[0]);
    }
  }, [enabledIds, chatModel]);

  function handleNewSearch() {
    setSession(null);
  }

  async function handleDeleteHistory(id: string) {
    try {
      await deleteSession(id);
      setHistoryItems((prev) => prev.filter((i) => i.id !== id));
      if (session?.id === id) {
        setSession(null);
      }
      setVaultError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setVaultError(message);
    }
  }

  async function handleSelectHistory(id: string) {
    try {
      const loaded = await loadSession(id);
      setSession(loaded);
      setVaultError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setVaultError(message);
    }
  }

  function handleSubmit(query: string) {
    if (!vaultReady) {
      setVaultSetupOpen(true);
      return;
    }

    const id = createSessionId();
    const next = createEmptySession(id, query);
    setSession(next);
    setHistoryItems((prev) =>
      upsertHistoryItem(prev, historyItemFromSession(next)),
    );
    void saveSessionNow(next, handleVaultSyncError);
    void runPipeline(
      id,
      query,
      chatModel,
      providerSettings[chatModel].modelName,
      setSession,
    );
  }

  function handleRunDatabaseSearch(payload: DatabaseSearchRunPayload) {
    if (!session) return;
    void runDatabaseSearchAndPipelineTail(
      session.id,
      payload,
      setSession,
    );
  }

  async function handleChangeVaultFromSettings() {
    try {
      const path = await pickVaultFolder();
      const previousId = session?.id;
      await handleVaultReady(path);
      if (previousId) {
        const exists = await loadSession(previousId).then(
          () => true,
          () => false,
        );
        if (!exists) {
          setSession(null);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message !== "No folder selected") {
        setVaultError(message);
      }
    }
  }

  if (!vaultReady) {
    return (
      <VaultSetupScreen
        onVaultSelected={(path) => void handleVaultReady(path)}
        errorMessage={vaultError}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        items={historyItems}
        activeId={session?.id ?? null}
        onSelect={(id) => void handleSelectHistory(id)}
        onDelete={(id) => void handleDeleteHistory(id)}
        onNewSearch={handleNewSearch}
        onSettingsClick={() => setSettingsOpen(true)}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        {vaultError && vaultReady && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {vaultError}
            <button
              type="button"
              className="ml-3 underline underline-offset-2"
              onClick={() => setVaultSetupOpen(true)}
            >
              Choose vault again
            </button>
          </div>
        )}
        <ChatArea
          session={session}
          onSubmit={handleSubmit}
          model={chatModel}
          onModelChange={setChatModel}
          enabledModelIds={enabledIds}
          onRunDatabaseSearch={handleRunDatabaseSearch}
          searchDisabled={!vaultReady}
        />
      </main>
      <ExportSidebar session={session} />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={providerSettings}
        onSettingsChange={setProviderSettings}
        vaultPath={vaultPath}
        onChangeVault={() => void handleChangeVaultFromSettings()}
      />
      {vaultSetupOpen && (
        <VaultSetupScreen
          onVaultSelected={(path) => void handleVaultReady(path)}
          errorMessage={vaultError}
        />
      )}
    </div>
  );
}

export default App;
