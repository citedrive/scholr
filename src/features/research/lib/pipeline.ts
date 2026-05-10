import type { Dispatch, SetStateAction } from "react";
import type {
  ResearchSession,
  PipelineStep,
  SearchStepData,
  DatabaseSearchRunPayload,
} from "@/types/research";
import {
  extractKeywords,
  combineKeywords,
} from "@/shared/lib/model-service";
import { searchLiterature } from "@/shared/lib/literature-search";
import { SEARCH_DATABASE_OPTIONS } from "@/shared/lib/search-databases";
import type { ChatModelId } from "@/shared/types/chat-model";
import { generateTailStepData } from "@/features/research/lib/session";
import { assignHeuristicRelevanceScores } from "@/features/research/lib/heuristic-relevance";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const POST_SEARCH_STEP_DURATIONS_MS = [700, 700, 1400] as const;

function patchSessionStep(
  setSession: Dispatch<SetStateAction<ResearchSession | null>>,
  sessionId: string,
  stepIndex: number,
  patch: Partial<PipelineStep>,
) {
  setSession((prev) => {
    if (!prev || prev.id !== sessionId) return prev;
    return {
      ...prev,
      steps: prev.steps.map((step, i) =>
        i === stepIndex ? { ...step, ...patch } : step,
      ),
    };
  });
}

export async function runPipeline(
  sessionId: string,
  query: string,
  provider: ChatModelId,
  modelName: string,
  setSession: Dispatch<SetStateAction<ResearchSession | null>>,
) {
  const updateStep = (
    index: number,
    patch: Partial<ResearchSession["steps"][number]>,
  ) => {
    setSession((prev) => {
      if (!prev || prev.id !== sessionId) return prev;
      return {
        ...prev,
        steps: prev.steps.map((step, i) =>
          i === index ? { ...step, ...patch } : step,
        ),
      };
    });
  };

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

  await delay(200);
  updateStep(1, { status: "running" });
  try {
    const combineData = await combineKeywords(
      query,
      extractedTerms,
      provider,
      modelName,
    );
    updateStep(1, { status: "done", data: combineData });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[model-service] combine_keywords failed:", errorMessage);
    updateStep(1, { status: "error", errorMessage });
    return;
  }
}

export async function runDatabaseSearchAndPipelineTail(
  sessionId: string,
  payload: DatabaseSearchRunPayload,
  setSession: Dispatch<SetStateAction<ResearchSession | null>>,
) {
  let steppedIn = false;
  setSession((prev) => {
    if (!prev || prev.id !== sessionId) return prev;
    if (!prev.steps[2] || prev.steps[2].status !== "pending") {
      return prev;
    }
    steppedIn = true;
    return {
      ...prev,
      steps: prev.steps.map((step, i) =>
        i === 2 ? { ...step, status: "running" as const } : step,
      ),
    };
  });

  if (!steppedIn) return;

  try {
    const literature = await searchLiterature(
      payload.apiId,
      payload.queryUsed,
    );
    const scored = assignHeuristicRelevanceScores(literature.papers);

    const apiLabel =
      SEARCH_DATABASE_OPTIONS.find((o) => o.id === payload.apiId)?.label ??
      payload.apiId;

    const corpusTotal = Math.max(literature.total, literature.returned);

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

    patchSessionStep(setSession, sessionId, 2, {
      status: "done",
      data: searchData,
      errorMessage: undefined,
    });

    const tailStepData = [tail.collect, tail.filter, tail.evaluate] as const;
    for (let i = 0; i < 3; i++) {
      const stepIndex = 3 + i;
      await delay(200);
      patchSessionStep(setSession, sessionId, stepIndex, { status: "running" });
      await delay(POST_SEARCH_STEP_DURATIONS_MS[i]);
      patchSessionStep(setSession, sessionId, stepIndex, {
        status: "done",
        data: tailStepData[i],
        errorMessage: undefined,
      });
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);
    console.error("[literature-search] failed:", errorMessage);
    patchSessionStep(setSession, sessionId, 2, {
      status: "error",
      errorMessage:
        `${errorMessage} — ensure you are running the desktop app ` +
        "with outbound network access, then try again.",
    });
    patchSessionStep(setSession, sessionId, 3, {
      status: "pending",
      data: undefined,
      errorMessage: undefined,
    });
    patchSessionStep(setSession, sessionId, 4, {
      status: "pending",
      data: undefined,
      errorMessage: undefined,
    });
    patchSessionStep(setSession, sessionId, 5, {
      status: "pending",
      data: undefined,
      errorMessage: undefined,
    });
  }
}
