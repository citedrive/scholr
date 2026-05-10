import { useEffect, useMemo, useState } from "react";
import type { ResearchSession } from "@/types/research";
import {
  MOCK_SESSIONS,
  createEmptySession,
  generateTailStepData,
} from "@/data/mock-data";
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
import { extractKeywords, combineKeywords } from "@/lib/model-service";
import type { DatabaseSearchRunPayload } from "@/components/research/PipelineStepCard";
import { SEARCH_DATABASE_OPTIONS } from "@/lib/search-databases";
import type { PipelineStep, SearchStepData } from "@/types/research";
import { searchLiterature } from "@/lib/literature-search";
import { assignMockRelevanceScores } from "@/lib/relevance-mock";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Simulated durations for collect → filter → evaluate after database search completes
const POST_SEARCH_STEP_DURATIONS_MS = [700, 700, 1400] as const;

function patchSessionStep(
  setSessions: React.Dispatch<React.SetStateAction<ResearchSession[]>>,
  sessionId: string,
  stepIndex: number,
  patch: Partial<PipelineStep>,
) {
  setSessions((prev) =>
    prev.map((s) => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        steps: s.steps.map((step, i) =>
          i === stepIndex ? { ...step, ...patch } : step,
        ),
      };
    }),
  );
}

async function runPipeline(
  sessionId: string,
  query: string,
  provider: ChatModelId,
  modelName: string,
  setSessions: React.Dispatch<React.SetStateAction<ResearchSession[]>>,
) {
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
  let extractedTerms: string[];
  try {
    const keywords = await extractKeywords(query, provider, modelName);
    updateStep(0, { status: "done", data: { keywords } });
    extractedTerms = keywords.map((k) => k.term);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[model-service] extract_keywords failed:", errorMessage);
    updateStep(0, { status: "error", errorMessage });
    return;
  }

  // Step 1 — combine: real model call; stop the pipeline on failure
  await delay(200);
  updateStep(1, { status: "running" });
  try {
    const combineData = await combineKeywords(query, extractedTerms, provider, modelName);
    updateStep(1, { status: "done", data: combineData });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[model-service] combine_keywords failed:", errorMessage);
    updateStep(1, { status: "error", errorMessage });
    return;
  }

  // Database search onward: user picks API + query variant in "Database search", then simulated tail.
}

async function runDatabaseSearchAndPipelineTail(
  sessionId: string,
  payload: DatabaseSearchRunPayload,
  setSessions: React.Dispatch<React.SetStateAction<ResearchSession[]>>,
) {
  let steppedIn = false;
  setSessions((prev) => {
    const session = prev.find((s) => s.id === sessionId);
    if (!session?.steps[2] || session.steps[2].status !== "pending") {
      return prev;
    }
    steppedIn = true;
    return prev.map((s) => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        steps: s.steps.map((step, i) =>
          i === 2 ? { ...step, status: "running" as const } : step,
        ),
      };
    });
  });

  if (!steppedIn) return;

  try {
    const literature = await searchLiterature(
      payload.apiId,
      payload.queryUsed,
    );
    const scored = assignMockRelevanceScores(literature.papers);

    const apiLabel =
      SEARCH_DATABASE_OPTIONS.find((o) => o.id === payload.apiId)?.label ??
      payload.apiId;

    const corpusTotal = Math.max(
      literature.total,
      literature.returned,
    );

    const searchData: SearchStepData = {
      total: corpusTotal,
      hitsReturned: literature.returned,
      sources: [{ name: apiLabel, count: corpusTotal }],
      chosenApi: payload.apiId,
      queryVariant: payload.queryVariant,
      queryUsed: payload.queryUsed,
      papers: scored,
    };

    const tail = generateTailStepData(corpusTotal, scored);

    patchSessionStep(setSessions, sessionId, 2, {
      status: "done",
      data: searchData,
      errorMessage: undefined,
    });

    const tailStepData = [tail.collect, tail.filter, tail.evaluate] as const;
    for (let i = 0; i < 3; i++) {
      const stepIndex = 3 + i;
      await delay(200);
      patchSessionStep(setSessions, sessionId, stepIndex, { status: "running" });
      await delay(POST_SEARCH_STEP_DURATIONS_MS[i]);
      patchSessionStep(setSessions, sessionId, stepIndex, {
        status: "done",
        data: tailStepData[i],
        errorMessage: undefined,
      });
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);
    console.error("[literature-search] failed:", errorMessage);
    patchSessionStep(setSessions, sessionId, 2, {
      status: "error",
      errorMessage:
        `${errorMessage} — ensure you are running the desktop app ` +
        "with outbound network access, then try again.",
    });
    patchSessionStep(setSessions, sessionId, 3, {
      status: "pending",
      data: undefined,
      errorMessage: undefined,
    });
    patchSessionStep(setSessions, sessionId, 4, {
      status: "pending",
      data: undefined,
      errorMessage: undefined,
    });
    patchSessionStep(setSessions, sessionId, 5, {
      status: "pending",
      data: undefined,
      errorMessage: undefined,
    });
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
          onRunDatabaseSearch={(sessionId, payload) =>
            void runDatabaseSearchAndPipelineTail(
              sessionId,
              payload,
              setSessions,
            )
          }
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
