import { CheckIcon, UpdateIcon, Cross2Icon, ArrowRightIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type {
  PipelineStep,
  StepStatus,
  KeywordsStepData,
  SearchStepData,
  CollectStepData,
  FilterStepData,
  EvaluateStepData,
} from "@/types/research";

// ── Status circle ─────────────────────────────────────────────────────────────

function StepCircle({ index, status }: { index: number; status: StepStatus }) {
  if (status === "done") {
    return (
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
        <CheckIcon className="size-3" />
      </div>
    );
  }
  if (status === "running") {
    return (
      <div className="relative flex size-6 shrink-0 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="flex size-6 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
          <UpdateIcon className="size-3 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive text-white">
        <Cross2Icon className="size-3" />
      </div>
    );
  }
  return (
    <div className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background">
      <span className="text-[10px] font-semibold text-muted-foreground">
        {index + 1}
      </span>
    </div>
  );
}

// ── Step content renderers ────────────────────────────────────────────────────

function KeywordsContent({ data }: { data: KeywordsStepData }) {
  return (
    <div className="flex flex-wrap gap-2">
      {data.keywords.map((kw) => (
        <span
          key={kw.term}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs"
        >
          <span className="font-medium">{kw.term}</span>
          <span className="text-muted-foreground">{kw.count.toLocaleString()}</span>
        </span>
      ))}
    </div>
  );
}

function SearchContent({ data }: { data: SearchStepData }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {data.total.toLocaleString()} papers across {data.sources.length} databases
      </p>
      <div className="flex flex-wrap gap-2">
        {data.sources.map((src) => (
          <div
            key={src.name}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs"
          >
            <span className="font-medium">{src.name}</span>
            <span className="text-muted-foreground">{src.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CollectContent({ data }: { data: CollectStepData }) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span>
        <span className="text-sm font-semibold text-foreground">
          {data.total.toLocaleString()}
        </span>{" "}
        papers collected
      </span>
      <span>·</span>
      <span>
        <span className="font-medium text-foreground">
          {data.withMetadata.toLocaleString()}
        </span>{" "}
        with full metadata
      </span>
    </div>
  );
}

function FilterContent({ data }: { data: FilterStepData }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium">{data.before.toLocaleString()}</span>
      <ArrowRightIcon className="size-3 text-muted-foreground" />
      <span className="text-destructive">
        −{data.removed.toLocaleString()} (no abstract)
      </span>
      <ArrowRightIcon className="size-3 text-muted-foreground" />
      <span className="font-semibold text-foreground">
        {data.after.toLocaleString()} remaining
      </span>
    </div>
  );
}

function RelevanceBadge({ score }: { score: number }) {
  return (
    <span
      className={cn(
        "inline-block w-10 rounded px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums",
        score >= 80
          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
          : score >= 60
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
            : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
      )}
    >
      {score}
    </span>
  );
}

function EvaluateContent({ data }: { data: EvaluateStepData }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-xs">
        <thead>
          <tr className="border-b border-border">
            {["Score", "Title", "Authors", "Year", "Journal"].map((h) => (
              <th key={h} className="pb-2 pr-3 text-left font-medium text-muted-foreground last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.papers.map((paper) => (
            <tr key={paper.id} className="border-b border-border/40 last:border-0">
              <td className="py-2 pr-3">
                <RelevanceBadge score={paper.relevanceScore} />
              </td>
              <td className="max-w-[240px] py-2 pr-3">
                <span className="line-clamp-2 font-medium text-foreground leading-snug">
                  {paper.title}
                </span>
              </td>
              <td className="max-w-[140px] py-2 pr-3 text-muted-foreground">
                <span className="block truncate">{paper.authors.join(", ")}</span>
              </td>
              <td className="py-2 pr-3 tabular-nums text-muted-foreground">{paper.year}</td>
              <td className="max-w-[140px] py-2 text-muted-foreground">
                <span className="block truncate">{paper.journal}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepContent({ step }: { step: PipelineStep }) {
  if (!step.data) return null;
  switch (step.id) {
    case "keywords":  return <KeywordsContent data={step.data as KeywordsStepData} />;
    case "search":    return <SearchContent   data={step.data as SearchStepData} />;
    case "collect":   return <CollectContent  data={step.data as CollectStepData} />;
    case "filter":    return <FilterContent   data={step.data as FilterStepData} />;
    case "evaluate":  return <EvaluateContent data={step.data as EvaluateStepData} />;
  }
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface PipelineStepCardProps {
  step: PipelineStep;
  index: number;
}

const CARD_STYLE: Record<StepStatus, string> = {
  pending: "border-border bg-card",
  running: "border-primary/40 bg-primary/[0.02]",
  done:    "border-border bg-card",
  error:   "border-destructive/40 bg-destructive/[0.02]",
};

const STATUS_LABEL: Partial<Record<StepStatus, { text: string; cls: string }>> = {
  running: { text: "Running…", cls: "text-primary animate-pulse" },
  pending: { text: "Pending", cls: "text-muted-foreground" },
  error:   { text: "Error", cls: "text-destructive" },
};

export function PipelineStepCard({ step, index }: PipelineStepCardProps) {
  const label = STATUS_LABEL[step.status];
  const hasContent = (step.status === "done" || step.status === "error") && step.data;

  return (
    <div className={cn("overflow-hidden rounded-xl border transition-colors", CARD_STYLE[step.status])}>
      <div className="flex items-center gap-3 px-4 py-3">
        <StepCircle index={index} status={step.status} />
        <span className="flex-1 text-sm font-medium">{step.label}</span>
        {label && (
          <span className={cn("text-xs", label.cls)}>{label.text}</span>
        )}
      </div>

      {hasContent && (
        <div className="border-t border-border/60 px-4 py-3">
          <StepContent step={step} />
        </div>
      )}

      {step.status === "error" && step.errorMessage && (
        <div className="border-t border-destructive/30 px-4 py-3">
          <p className="text-xs text-destructive">{step.errorMessage}</p>
        </div>
      )}
    </div>
  );
}
