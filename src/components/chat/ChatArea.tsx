import type { ResearchSession } from "@/types/research";
import { ResearchView } from "@/components/research/ResearchView";
import type { DatabaseSearchRunPayload } from "@/components/research/PipelineStepCard";
import { ChatInput, type ChatModelId } from "./ChatInput";

interface ChatAreaProps {
  session: ResearchSession | null;
  onSubmit: (query: string) => void;
  model: ChatModelId;
  onModelChange: (id: ChatModelId) => void;
  enabledModelIds: ChatModelId[];
  onRunDatabaseSearch: (
    sessionId: string,
    payload: DatabaseSearchRunPayload,
  ) => void;
}

export function ChatArea({
  session,
  onSubmit,
  model,
  onModelChange,
  enabledModelIds,
  onRunDatabaseSearch,
}: ChatAreaProps) {
  if (session) {
    return (
      <ResearchView
        session={session}
        onRunDatabaseSearch={onRunDatabaseSearch}
      />
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <ChatInput
          onSubmit={onSubmit}
          borderless
          model={model}
          onModelChange={onModelChange}
          enabledModelIds={enabledModelIds}
        />
      </div>
    </div>
  );
}
