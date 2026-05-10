import { useState } from "react";
import { CheckIcon, UpdateIcon, Cross2Icon, ArrowRightIcon } from "@radix-ui/react-icons";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import type {
  PipelineStep,
  StepStatus,
  KeywordsStepData,
  CombineStepData,
  SearchStepData,
  CollectStepData,
  FilterStepData,
  EvaluateStepData,
  SearchQueryVariant,
  ResearchSession,
  DatabaseSearchRunPayload,
} from "@/types/research";
import {
  SEARCH_DATABASE_OPTIONS,
  type SearchApiId,
} from "@/shared/lib/search-databases";

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

function CombineContent({ data }: { data: CombineStepData }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-2">
        {data.groups.map((group, gi) => (
          <div key={group.label} className="flex items-start gap-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {group.terms.map((term, ti) => (
                  <div key={term} className="flex items-center gap-1">
                    <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
                      {term}
                    </span>
                    {ti < group.terms.length - 1 && (
                      <span className="text-[10px] font-semibold text-muted-foreground">OR</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {gi < data.groups.length - 1 && (
              <span className="mt-5 shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                AND
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-md border border-border bg-muted/50 px-3 py-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Search string
        </p>
        <code className="break-all text-xs text-foreground">{data.searchString}</code>
      </div>
      <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Narrow search
        </p>
        <p className="mb-1 text-[11px] text-muted-foreground">
          Fewer synonyms — tighter results for systematic screening.
        </p>
        <code className="break-all text-xs text-foreground">
          {data.preciseSearchString}
        </code>
      </div>
    </div>
  );
}

function SearchContent({ data }: { data: SearchStepData }) {
  const apiLabel =
    SEARCH_DATABASE_OPTIONS.find((o) => o.id === data.chosenApi)?.label ??
    data.chosenApi;
  const variantLabel =
    data.queryVariant === "broad" ? "General search string" : "Narrow search string";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{apiLabel}</span>
          <span className="mx-1.5 text-border">·</span>
          {variantLabel}
        </span>
        <span className="tabular-nums">
          <span className="font-semibold text-foreground">
            {data.total.toLocaleString()}
          </span>{" "}
          reported hits ·{" "}
          <span className="font-semibold text-foreground">
            {data.hitsReturned.toLocaleString()}
          </span>{" "}
          fetched
        </span>
      </div>
      <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Query executed
        </p>
        <code className="break-all text-xs text-foreground">{data.queryUsed}</code>
      </div>
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

      {data.papers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No papers returned for this query. Try the general string, a different
          API, or simpler terms.
        </p>
      ) : (
        <div className="max-h-64 overflow-y-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="sticky top-0 border-b border-border bg-muted/70">
                <th className="w-12 px-2 py-1.5 text-left font-medium text-muted-foreground">
                  Score
                </th>
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                  Title / authors
                </th>
                <th className="w-14 px-2 py-1.5 text-left font-medium text-muted-foreground">
                  Year
                </th>
              </tr>
            </thead>
            <tbody>
              {data.papers.map((p) => (
                <tr key={p.id} className="border-b border-border/40 last:border-0">
                  <td className="px-2 py-2 align-top">
                    <RelevanceBadge score={p.relevanceScore} />
                  </td>
                  <td className="max-w-0 px-2 py-2 align-top">
                    <p className="line-clamp-2 font-medium leading-snug">{p.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-muted-foreground">
                      {p.authors.length > 0 ? p.authors.join(", ") : "—"}
                    </p>
                  </td>
                  <td className="px-2 py-2 align-top tabular-nums text-muted-foreground">
                    {p.year > 0 ? p.year : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DatabaseSearchSetup({
  combine,
  onRun,
}: {
  combine: CombineStepData;
  onRun: (payload: DatabaseSearchRunPayload) => void;
}) {
  const [apiId, setApiId] = useState<SearchApiId>(
    SEARCH_DATABASE_OPTIONS[0].id,
  );
  const [queryVariant, setQueryVariant] =
    useState<SearchQueryVariant>("broad");

  const queryPreview =
    queryVariant === "broad"
      ? combine.searchString
      : combine.preciseSearchString;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Pick a literature API, choose whether to run your general or narrow
        constructed query, then start the database search.
      </p>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Literature API
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SEARCH_DATABASE_OPTIONS.map((db) => {
            const selected = apiId === db.id;
            return (
              <button
                key={db.id}
                type="button"
                onClick={() => setApiId(db.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/30 hover:bg-muted/50",
                )}
              >
                <span className="font-semibold text-foreground">{db.label}</span>
                <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                  {db.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Query variant
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setQueryVariant("broad")}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              queryVariant === "broad"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
            )}
          >
            General
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
              Recall-oriented constructed string
            </span>
          </button>
          <button
            type="button"
            onClick={() => setQueryVariant("narrow")}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              queryVariant === "narrow"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
            )}
          >
            Narrow
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
              Fewer synonyms, tighter precision
            </span>
          </button>
        </div>
      </div>

      <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Preview
        </p>
        <code className="break-all text-xs text-foreground">{queryPreview}</code>
      </div>

      <Button
        type="button"
        size="sm"
        className="w-fit"
        onClick={() =>
          onRun({ apiId, queryVariant, queryUsed: queryPreview })
        }
      >
        Run database search
      </Button>
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

export function RelevanceBadge({ score }: { score: number }) {
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
    case "keywords":
      return <KeywordsContent data={step.data as KeywordsStepData} />;
    case "combine":
      return <CombineContent data={step.data as CombineStepData} />;
    case "search":
      return <SearchContent data={step.data as SearchStepData} />;
    case "collect":
      return <CollectContent data={step.data as CollectStepData} />;
    case "filter":
      return <FilterContent data={step.data as FilterStepData} />;
    case "evaluate":
      return <EvaluateContent data={step.data as EvaluateStepData} />;
  }
}

function isCombineReadyForSearch(session: ResearchSession) {
  const combine = session.steps[1];
  return combine.status === "done" && combine.data !== undefined;
}

interface PipelineStepCardProps {
  session: ResearchSession;
  step: PipelineStep;
  index: number;
  onRunDatabaseSearch?: (payload: DatabaseSearchRunPayload) => void;
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

export function PipelineStepCard({
  session,
  step,
  index,
  onRunDatabaseSearch,
}: PipelineStepCardProps) {
  const searchAwaitingChoices =
    step.id === "search" &&
    step.status === "pending" &&
    isCombineReadyForSearch(session);

  const label =
    searchAwaitingChoices
      ? { text: "Your turn", cls: "text-primary font-medium" }
      : STATUS_LABEL[step.status];

  const hasFinishedOrErrorContent =
    (step.status === "done" || step.status === "error") && step.data;

  return (
    <div className={cn("overflow-hidden rounded-xl border transition-colors", CARD_STYLE[step.status])}>
      <div className="flex items-center gap-3 px-4 py-3">
        <StepCircle index={index} status={step.status} />
        <span className="flex-1 text-sm font-medium">{step.label}</span>
        {label && (
          <span className={cn("text-xs", label.cls)}>{label.text}</span>
        )}
      </div>

      {hasFinishedOrErrorContent && (
        <div className="border-t border-border/60 px-4 py-3">
          <StepContent step={step} />
        </div>
      )}

      {searchAwaitingChoices && onRunDatabaseSearch && (
        <div className="border-t border-border/60 px-4 py-3">
          <DatabaseSearchSetup
            combine={session.steps[1].data as CombineStepData}
            onRun={onRunDatabaseSearch}
          />
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
