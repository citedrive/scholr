import { useEffect, useMemo, useState } from "react";
import type { ResearchSession, DatabaseSearchRunPayload } from "@/types/research";
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
import {
  DEFAULT_PROVIDER_SETTINGS,
  enabledModelIds,
  type ProviderModelSettings,
} from "@/shared/lib/model-settings";
import {
  runPipeline,
  runDatabaseSearchAndPipelineTail,
} from "@/features/research/lib/pipeline";

function App() {
  const [session, setSession] = useState<ResearchSession | null>(null);
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

  useEffect(() => {
    if (enabledIds.length === 0) return;
    if (!enabledIds.includes(chatModel)) {
      setChatModel(enabledIds[0]);
    }
  }, [enabledIds, chatModel]);

  function handleNewSearch() {
    setSession(null);
  }

  function handleSubmit(query: string) {
    const id = createSessionId();
    const next = createEmptySession(id, query);
    setSession(next);
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

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        onNewSearch={handleNewSearch}
        onSettingsClick={() => setSettingsOpen(true)}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        <ChatArea
          session={session}
          onSubmit={handleSubmit}
          model={chatModel}
          onModelChange={setChatModel}
          enabledModelIds={enabledIds}
          onRunDatabaseSearch={handleRunDatabaseSearch}
        />
      </main>
      <ExportSidebar session={session} />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={providerSettings}
        onSettingsChange={setProviderSettings}
      />
    </div>
  );
}

export default App;
