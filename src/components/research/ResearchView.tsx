import type { ResearchSession } from "@/types/research";
import { PipelineStepCard } from "./PipelineStepCard";

interface ResearchViewProps {
  session: ResearchSession;
}

export function ResearchView({ session }: ResearchViewProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {/* Query header */}
          <div className="mb-6 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Research question
            </p>
            <p className="font-medium leading-snug">{session.query}</p>
          </div>

          {/* Pipeline */}
          <div className="flex flex-col gap-3">
            {session.steps.map((step, i) => (
              <PipelineStepCard key={step.id} step={step} index={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
