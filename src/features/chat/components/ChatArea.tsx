import type { ResearchSession, DatabaseSearchRunPayload } from "@/types/research";
import { ResearchView } from "@/features/research/components/ResearchView";
import { ChatInput, type ChatModelId } from "@/features/chat/components/ChatInput";

interface ChatAreaProps {
  session: ResearchSession | null;
  onSubmit: (query: string) => void;
  model: ChatModelId;
  onModelChange: (id: ChatModelId) => void;
  enabledModelIds: ChatModelId[];
  onRunDatabaseSearch: (payload: DatabaseSearchRunPayload) => void;
  searchDisabled?: boolean;
}

export function ChatArea({
  session,
  onSubmit,
  model,
  onModelChange,
  enabledModelIds,
  onRunDatabaseSearch,
  searchDisabled = false,
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
        {searchDisabled && (
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Please choose a vault folder first.
          </p>
        )}
        <ChatInput
          onSubmit={onSubmit}
          borderless
          model={model}
          onModelChange={onModelChange}
          enabledModelIds={enabledModelIds}
          disabled={searchDisabled}
        />
      </div>
    </div>
  );
}
