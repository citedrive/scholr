import { useEffect, useMemo, useState } from "react";
import type { ResearchSession } from "@/types/research";
import { MOCK_SESSIONS, createEmptySession, generateStepData } from "@/data/mock-data";
import { Sidebar } from "@/components/sidebar/Sidebar";
import {
  CHAT_MODEL_OPTIONS,
  type ChatModelId,
} from "@/components/chat/ChatInput";
import { ChatArea } from "@/components/chat/ChatArea";
import { ExportSidebar } from "@/components/export/ExportSidebar";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import {
  DEFAULT_PROVIDER_SETTINGS,
  enabledModelIds,
  type ProviderModelSettings,
} from "@/lib/model-settings";
import { extractKeywords } from "@/lib/model-service";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// How long steps 1–4 spend in "running" before resolving to "done"
const STEP_DURATIONS = [1000, 700, 700, 1400];

async function runPipeline(
  sessionId: string,
  query: string,
  provider: ChatModelId,
  modelName: string,
  setSessions: React.Dispatch<React.SetStateAction<ResearchSession[]>>,
) {
  const mockStepData = generateStepData(query);

  const updateStep = (
    index: number,
    patch: Partial<ResearchSession["steps"][number]>,
  ) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          steps: s.steps.map((step, i) =>
            i === index ? { ...step, ...patch } : step,
          ),
        };
      }),
    );
  };

  // Step 0 — keywords: real model call; stop the pipeline on failure
  await delay(300);
  updateStep(0, { status: "running" });
  try {
    const keywords = await extractKeywords(query, provider, modelName);
    updateStep(0, { status: "done", data: { keywords } });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[model-service] extract_keywords failed:", errorMessage);
    updateStep(0, { status: "error", errorMessage });
    return;
  }

  // Steps 1–4 — search, collect, filter, evaluate: simulated
  for (let i = 1; i < mockStepData.length; i++) {
    await delay(200);
    updateStep(i, { status: "running" });
    await delay(STEP_DURATIONS[i - 1]);
    updateStep(i, { status: "done", data: mockStepData[i] });
  }
}

function App() {
  const [sessions, setSessions] = useState<ResearchSession[]>(MOCK_SESSIONS);
  const [activeId, setActiveId] = useState<string | null>(
    MOCK_SESSIONS[0]?.id ?? null,
  );
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

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  function handleNewSearch() {
    setActiveId(null);
  }

  function handleSubmit(query: string) {
    const id = makeId();
    const session = createEmptySession(id, query);
    setSessions((prev) => [session, ...prev]);
    setActiveId(id);
    runPipeline(id, query, chatModel, providerSettings[chatModel].modelName, setSessions);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onNewSearch={handleNewSearch}
        onSelectSession={setActiveId}
        onSettingsClick={() => setSettingsOpen(true)}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        <ChatArea
          session={activeSession}
          onSubmit={handleSubmit}
          model={chatModel}
          onModelChange={setChatModel}
          enabledModelIds={enabledIds}
        />
      </main>
      <ExportSidebar session={activeSession} />
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
