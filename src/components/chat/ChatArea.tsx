import type { ResearchSession } from "@/types/research";
import { ResearchView } from "@/components/research/ResearchView";
import { ChatInput, type ChatModelId } from "./ChatInput";

interface ChatAreaProps {
  session: ResearchSession | null;
  onSubmit: (query: string) => void;
  model: ChatModelId;
  onModelChange: (id: ChatModelId) => void;
}

export function ChatArea({
  session,
  onSubmit,
  model,
  onModelChange,
}: ChatAreaProps) {
  if (session) {
    return <ResearchView session={session} />;
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <ChatInput
          onSubmit={onSubmit}
          borderless
          model={model}
          onModelChange={onModelChange}
        />
      </div>
    </div>
  );
}
