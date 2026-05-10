import { DownloadIcon } from "@radix-ui/react-icons";
import type { ResearchSession, EvaluateStepData } from "@/types/research";
import { cn } from "@/shared/lib/utils";

interface ExportFormat {
  id: string;
  label: string;
  ext: string;
}

const REFERENCE_FORMATS: ExportFormat[] = [
  { id: "bibtex",      label: "BibTeX",      ext: ".bib" },
  { id: "jabref",      label: "JabRef",      ext: ".bib" },
  { id: "endnote-xml", label: "EndNote XML", ext: ".xml" },
  { id: "endnote",     label: "EndNote",     ext: ".enl" },
  { id: "ris",         label: "RIS",         ext: ".ris" },
  { id: "zotero",      label: "Zotero RDF",  ext: ".rdf" },
];

const OTHER_FORMATS: ExportFormat[] = [
  { id: "csv",  label: "Spreadsheet", ext: ".csv"  },
  { id: "json", label: "JSON",        ext: ".json" },
];

function ExportButton({ format }: { format: ExportFormat }) {
  return (
    <button
      className={cn(
        "group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors",
        "text-sm text-foreground hover:bg-accent",
      )}
      onClick={() => { /* hook up real export */ }}
    >
      <span>{format.label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground tabular-nums">
          {format.ext}
        </span>
        <DownloadIcon className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </button>
  );
}

interface ExportSidebarProps {
  session: ResearchSession | null;
}

export function ExportSidebar({ session }: ExportSidebarProps) {
  const evaluateStep = session?.steps.find((s) => s.id === "evaluate");
  const papers =
    evaluateStep?.status === "done"
      ? (evaluateStep.data as EvaluateStepData | undefined)?.papers ?? []
      : [];

  return (
    <aside className="w-52 shrink-0 overflow-y-auto py-4 pr-4 pl-2">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="px-4 pt-4 pb-3">
          <p className="text-sm font-semibold">Export</p>
          {papers.length > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {papers.length} papers
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              No results yet
            </p>
          )}
        </div>

        {session ? (
          <div className="px-2 pb-3">
            <p className="px-2.5 pb-1 pt-1 text-xs font-medium text-muted-foreground">
              Reference managers
            </p>
            <div className="flex flex-col gap-0.5">
              {REFERENCE_FORMATS.map((fmt) => (
                <ExportButton key={fmt.id} format={fmt} />
              ))}
            </div>

            <div className="my-2 mx-2 border-t border-border" />

            <p className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">
              Other
            </p>
            <div className="flex flex-col gap-0.5">
              {OTHER_FORMATS.map((fmt) => (
                <ExportButton key={fmt.id} format={fmt} />
              ))}
            </div>
          </div>
        ) : (
          <p className="px-4 pb-4 text-xs text-muted-foreground">
            Run a search to export results.
          </p>
        )}
      </div>
    </aside>
  );
}
